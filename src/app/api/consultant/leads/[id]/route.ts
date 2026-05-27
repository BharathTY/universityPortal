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
} from "@/lib/consultant-lead-payload";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { storeUpload } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";
import { isConsultant, isConsultantSpoc } from "@/lib/roles";

type Ctx = { params: Promise<{ id: string }> };

const statusPatchSchema = z.object({
  admissionStatus: z.nativeEnum(AdmissionLeadStatus).optional(),
  pipelineStatus: z.nativeEnum(LeadPipelineStatus).optional(),
});

async function resolvePaymentAmount(universityId: string): Promise<Prisma.Decimal> {
  const uni = await prisma.university.findUnique({
    where: { id: universityId },
    select: { registrationFee: true, applicationFee: true },
  });
  const raw = uni?.registrationFee ?? uni?.applicationFee;
  const n = raw != null ? Number(String(raw)) : 0;
  return new Prisma.Decimal(Number.isFinite(n) && n > 0 ? n.toFixed(2) : "0.00");
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
  try {
    const parsedReq = await parseConsultantLeadRequest(req);
    json = parsedReq.data;
    photoFile = parsedReq.photoFile;
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
  if (photoFile) {
    try {
      const stored = await storeUpload(photoFile, "leads/photos", "image");
      photoUrl = stored.fileUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Photo upload failed";
      return NextResponse.json({ error: msg, fieldErrors: { photoFile: [msg] } }, { status: 400 });
    }
  } else if (!photoUrl) {
    return NextResponse.json(
      { error: "Photo is required", fieldErrors: { photoFile: ["Upload a JPG, JPEG, or PNG photo (max 2 MB)"] } },
      { status: 400 },
    );
  }

  try {
    const lead = await prisma.admissionLead.update({
      where: { id },
      data: {
        universityId: targetUniversityId,
        academicYearId: yearId,
        streamId: parsed.data.streamId,
        ...extended,
        photoUrl,
      },
      select: consultantLeadDetailSelect,
    });
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
            const amount = await resolvePaymentAmount(existing.universityId);
            const collectedBy: PaymentCollectedBy = isConsultantSpoc(roles) ? "SPOC" : "CONSULTANT";
            await tx.leadPayment.create({
              data: {
                leadId: id,
                amount,
                status: "PENDING",
                collectedBy,
                collectedByUserId: userId,
                paymentMethod: "Registration fee",
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
