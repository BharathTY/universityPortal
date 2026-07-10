import {
  AdmissionLeadStatus,
  ApplicationStatus,
  LeadPipelineStatus,
  PaymentCollectedBy,
  Prisma,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { resolveAcademicYearIdForLead } from "@/lib/consultant-default-year";
import {
  buildLeadExtendedData,
  consultantLeadBodySchema,
  consultantLeadDetailSelect,
  parseConsultantLeadRequest,
  replaceLeadEntranceExams,
} from "@/lib/consultant-lead-payload";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { storeUpload } from "@/lib/file-storage";
import {
  canTransitionLeadStatus,
  LEAD_STATUS_WORKFLOW_MESSAGE,
  READY_TO_PAY_LOCKED_MESSAGE,
} from "@/lib/lead-status-workflow";
import { ensureStudentApplicationForLead } from "@/lib/ensure-student-for-lead";
import { resolveLeadRegistrationFeeRupeesFromRow } from "@/lib/lead-registration-fee";
import { splitAmountFields } from "@/lib/payment-split-db";
import { prisma } from "@/lib/prisma";
import { isConsultant, isConsultantSpoc } from "@/lib/roles";

type Ctx = { params: Promise<{ id: string }> };

const statusPatchSchema = z.object({
  admissionStatus: z.nativeEnum(AdmissionLeadStatus).optional(),
  pipelineStatus: z.nativeEnum(LeadPipelineStatus).optional(),
});

async function resolvePaymentAmountForLead(leadId: string): Promise<Prisma.Decimal> {
  const lead = await prisma.admissionLead.findUnique({
    where: { id: leadId },
    select: {
      stream: {
        select: {
          applicationFee: true,
        },
      },
      university: { select: { applicationFee: true } },
    },
  });
  if (!lead) return new Prisma.Decimal("0.00");
  const n = resolveLeadRegistrationFeeRupeesFromRow(lead);
  return new Prisma.Decimal(n > 0 ? n.toFixed(2) : "0.00");
}

async function loadOwnedLead(id: string, userId: string) {
  const allowed = await getAllowedConsultantUniversityIds(userId);
  if (allowed.length === 0) return null;
  return prisma.admissionLead.findFirst({
    where: { id, universityId: { in: allowed }, createdByUserId: userId },
    select: consultantLeadDetailSelect,
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session || !isConsultant(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const lead = await loadOwnedLead(id, session.sub);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session || !isConsultant(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.admissionLead.findFirst({
    where: {
      id,
      createdByUserId: session.sub,
      universityId: { in: await getAllowedConsultantUniversityIds(session.sub) },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  let json: unknown;
  let photoFile: File | null = null;
  let sslcMarksCardFile: File | null = null;
  let qualMarksCardFile: File | null = null;
  try {
    const parsedReq = await parseConsultantLeadRequest(req);
    json = parsedReq.data;
    photoFile = parsedReq.photoFile;
    sslcMarksCardFile = parsedReq.sslcMarksCardFile;
    qualMarksCardFile = parsedReq.qualMarksCardFile;
  } catch {
    return NextResponse.json({ error: "Invalid JSON or form data" }, { status: 400 });
  }

  const rawKeys = Object.keys(json as Record<string, unknown>);
  const isStatusOnly =
    rawKeys.length > 0 && rawKeys.every((k) => k === "admissionStatus" || k === "pipelineStatus");

  if (isStatusOnly) {
    const statusOnly = statusPatchSchema.safeParse(json);
    if (!statusOnly.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return patchLeadStatus(id, existing, session.sub, session.roles, statusOnly.data);
  }

  const parsed = consultantLeadBodySchema.safeParse(json);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: flat.fieldErrors, formErrors: flat.formErrors },
      { status: 400 },
    );
  }

  const targetUniversityId = parsed.data.universityId ?? existing.universityId;
  const [yearId, stream] = await Promise.all([
    resolveAcademicYearIdForLead(targetUniversityId, parsed.data.academicYearId ?? existing.academicYearId),
    prisma.stream.findFirst({
      where: { id: parsed.data.streamId, universityId: targetUniversityId },
    }),
  ]);

  if (!yearId || !stream) {
    return NextResponse.json(
      { error: "Configure a valid academic year and stream for this university" },
      { status: 400 },
    );
  }

  let extended;
  try {
    extended = buildLeadExtendedData(parsed.data);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "INVALID_REFERRAL_EMAIL") {
      return NextResponse.json(
        { error: "Invalid input", fieldErrors: { referralEmail: ["Enter a valid email address"] } },
        { status: 400 },
      );
    }
    if (code === "INVALID_REFERRAL_PHONE") {
      return NextResponse.json(
        { error: "Invalid input", fieldErrors: { referralPhone: ["Enter a valid contact number (at least 10 digits)"] } },
        { status: 400 },
      );
    }
    throw e;
  }

  if (extended.email !== existing.email) {
    const clash = await prisma.admissionLead.findFirst({
      where: { universityId: targetUniversityId, email: extended.email, NOT: { id } },
    });
    if (clash) {
      return NextResponse.json({ error: "Email already used by another lead" }, { status: 409 });
    }
  }

  let photoUrl = existing.photoUrl;
  if (parsed.data.removePhoto) {
    photoUrl = null;
  } else if (photoFile) {
    try {
      const stored = await storeUpload(photoFile, "leads/photos", "image");
      photoUrl = stored.fileUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Photo upload failed";
      return NextResponse.json({ error: msg, fieldErrors: { photoFile: [msg] } }, { status: 400 });
    }
  }

  let sslcMarksCardUrl = existing.sslcMarksCardUrl;
  if (sslcMarksCardFile) {
    try {
      const stored = await storeUpload(sslcMarksCardFile, "leads/marks-cards", "mou", {
        maxBytes: 5 * 1024 * 1024,
      });
      sslcMarksCardUrl = stored.fileUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "10th marks card upload failed";
      return NextResponse.json({ error: msg, fieldErrors: { sslcMarksCardFile: [msg] } }, { status: 400 });
    }
  }

  let qualMarksCardUrl = existing.qualMarksCardUrl;
  if (qualMarksCardFile) {
    try {
      const stored = await storeUpload(qualMarksCardFile, "leads/marks-cards", "mou", {
        maxBytes: 5 * 1024 * 1024,
      });
      qualMarksCardUrl = stored.fileUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Qualification marks card upload failed";
      return NextResponse.json({ error: msg, fieldErrors: { qualMarksCardFile: [msg] } }, { status: 400 });
    }
  }

  try {
    const lead = await prisma.$transaction(async (tx) => {
      await tx.admissionLead.update({
        where: { id },
        data: {
          universityId: targetUniversityId,
          academicYearId: yearId,
          streamId: parsed.data.streamId,
          ...extended,
          photoUrl,
          sslcMarksCardUrl,
          qualMarksCardUrl,
        },
        select: consultantLeadDetailSelect,
      });
      await replaceLeadEntranceExams(tx, id, parsed.data.hasEntranceExams, parsed.data.entranceExams);
      return tx.admissionLead.findUniqueOrThrow({
        where: { id },
        select: consultantLeadDetailSelect,
      });
    });
    const ensured = await ensureStudentApplicationForLead({
      leadId: id,
      consultantUserId: session.sub,
    });
    if (!ensured.ok) {
      console.warn("ensureStudentApplicationForLead on update", ensured.error);
    }
    return NextResponse.json({ lead });
  } catch (e) {
    console.error("consultant lead PATCH", e);
    return NextResponse.json({ error: "Could not update lead" }, { status: 500 });
  }
}

async function patchLeadStatus(
  id: string,
  existing: { universityId: string; admissionStatus: AdmissionLeadStatus; pipelineStatus: LeadPipelineStatus },
  userId: string,
  roles: string[],
  data: z.infer<typeof statusPatchSchema>,
) {
  if (existing.pipelineStatus === LeadPipelineStatus.CONVERTED && data.pipelineStatus === LeadPipelineStatus.LOST) {
    return NextResponse.json({ error: "Cannot mark a converted lead as lost" }, { status: 400 });
  }

  const nextAdmissionStatus = data.admissionStatus;
  const statusChanging =
    nextAdmissionStatus !== undefined && nextAdmissionStatus !== existing.admissionStatus;

  if (statusChanging && nextAdmissionStatus) {
    const [successfulPayment, paymentDoneHistory] = await Promise.all([
      prisma.leadPayment.findFirst({
        where: { leadId: id, status: "SUCCESS" },
        select: { id: true },
      }),
      prisma.admissionLeadStatusHistory.findFirst({
        where: { leadId: id, toStatus: AdmissionLeadStatus.PAYMENT_DONE },
        select: { id: true },
      }),
    ]);
    const paymentCompleted = Boolean(successfulPayment || paymentDoneHistory);

    if (
      !canTransitionLeadStatus(existing.admissionStatus, nextAdmissionStatus, {
        paymentCompleted,
      })
    ) {
      const message =
        nextAdmissionStatus === AdmissionLeadStatus.READY_TO_PAY && paymentCompleted
          ? READY_TO_PAY_LOCKED_MESSAGE
          : LEAD_STATUS_WORKFLOW_MESSAGE;
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  try {
    const lead = await prisma.$transaction(async (tx) => {
      if (statusChanging && nextAdmissionStatus) {
        await tx.admissionLeadStatusHistory.create({
          data: {
            leadId: id,
            fromStatus: existing.admissionStatus,
            toStatus: nextAdmissionStatus,
            changedByUserId: userId,
          },
        });

        if (nextAdmissionStatus === AdmissionLeadStatus.READY_TO_PAY) {
          const pending = await tx.leadPayment.findFirst({
            where: { leadId: id, status: "PENDING" },
          });
          if (!pending) {
            const amount = await resolvePaymentAmountForLead(id);
            const amountNum = Number(String(amount));
            const shares = splitAmountFields(amountNum);
            const collectedBy: PaymentCollectedBy = isConsultantSpoc(roles) ? "SPOC" : "CONSULTANT";
            await tx.leadPayment.create({
              data: {
                leadId: id,
                amount,
                universityShare: shares.universityShare,
                platformShare: shares.platformShare,
                status: "PENDING",
                collectedBy,
                collectedByUserId: userId,
                paymentMethod: "Application fee",
              },
            });
          }
        }
      }

      return tx.admissionLead.update({
        where: { id },
        data: {
          ...(data.pipelineStatus !== undefined ? { pipelineStatus: data.pipelineStatus } : {}),
          ...(nextAdmissionStatus !== undefined ? { admissionStatus: nextAdmissionStatus } : {}),
        },
        select: consultantLeadDetailSelect,
      });
    });

    if (statusChanging && nextAdmissionStatus === AdmissionLeadStatus.READY_TO_PAY) {
      const ensured = await ensureStudentApplicationForLead({ leadId: id, consultantUserId: userId });
      if (!ensured.ok) {
        console.warn("ensureStudentApplicationForLead", ensured.error);
      }
    }

    return NextResponse.json({ lead });
  } catch (e) {
    console.error("consultant lead status PATCH", e);
    return NextResponse.json({ error: "Could not update lead" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session || !isConsultant(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.admissionLead.findFirst({
    where: {
      id,
      createdByUserId: session.sub,
      universityId: { in: await getAllowedConsultantUniversityIds(session.sub) },
    },
    include: { application: { select: { id: true, status: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (
    existing.application &&
    existing.application.status !== ApplicationStatus.APPLICATION_DETAILS_PENDING
  ) {
    return NextResponse.json(
      { error: "Cannot delete a lead with an active student application. Contact support if needed." },
      { status: 409 },
    );
  }

  try {
    await prisma.admissionLead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("consultant lead DELETE", e);
    return NextResponse.json({ error: "Could not delete lead" }, { status: 500 });
  }
}
