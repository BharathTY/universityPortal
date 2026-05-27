import { AdmissionLeadStatus, LeadPipelineStatus, PaymentCollectedBy, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultant, isConsultantSpoc } from "@/lib/roles";

const patchSchema = z.object({
  firstName: z.string().min(1).max(120).trim().optional(),
  lastName: z.string().min(1).max(120).trim().optional(),
  email: z.string().email().max(254).trim().optional(),
  mobile: z.string().min(5).max(32).trim().optional(),
  nationality: z.string().max(120).trim().optional().nullable(),
  pipelineStatus: z.nativeEnum(LeadPipelineStatus).optional(),
  admissionStatus: z.nativeEnum(AdmissionLeadStatus).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function resolvePaymentAmount(universityId: string): Promise<Prisma.Decimal> {
  const uni = await prisma.university.findUnique({
    where: { id: universityId },
    select: { registrationFee: true, applicationFee: true },
  });
  const raw = uni?.registrationFee ?? uni?.applicationFee;
  const n = raw != null ? Number(String(raw)) : 0;
  return new Prisma.Decimal(Number.isFinite(n) && n > 0 ? n.toFixed(2) : "0.00");
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isConsultant(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const allowed = await getAllowedConsultantUniversityIds(session.sub);
  if (allowed.length === 0) {
    return NextResponse.json({ error: "No universities assigned" }, { status: 400 });
  }
  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.admissionLead.findFirst({
    where: { id, universityId: { in: allowed }, createdByUserId: session.sub },
  });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  const universityId = existing.universityId;

  if (existing.pipelineStatus === LeadPipelineStatus.CONVERTED && parsed.data.pipelineStatus === LeadPipelineStatus.LOST) {
    return NextResponse.json({ error: "Cannot mark a converted lead as lost" }, { status: 400 });
  }

  if (parsed.data.email && parsed.data.email.toLowerCase() !== existing.email) {
    const clash = await prisma.admissionLead.findFirst({
      where: { universityId, email: parsed.data.email.toLowerCase(), NOT: { id } },
    });
    if (clash) {
      return NextResponse.json({ error: "Email already used by another lead" }, { status: 409 });
    }
  }

  const nextAdmissionStatus = parsed.data.admissionStatus;
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
            changedByUserId: session.sub,
          },
        });

        if (nextAdmissionStatus === AdmissionLeadStatus.READY_TO_PAY) {
          const pending = await tx.leadPayment.findFirst({
            where: { leadId: id, status: "PENDING" },
          });
          if (!pending) {
            const amount = await resolvePaymentAmount(universityId);
            const collectedBy: PaymentCollectedBy = isConsultantSpoc(session.roles) ? "SPOC" : "CONSULTANT";
            await tx.leadPayment.create({
              data: {
                leadId: id,
                amount,
                status: "PENDING",
                collectedBy,
                collectedByUserId: session.sub,
                paymentMethod: "Registration fee",
              },
            });
          }
        }
      }

      return tx.admissionLead.update({
        where: { id },
        data: {
          ...(parsed.data.firstName !== undefined ? { firstName: parsed.data.firstName } : {}),
          ...(parsed.data.lastName !== undefined ? { lastName: parsed.data.lastName } : {}),
          ...(parsed.data.email !== undefined ? { email: parsed.data.email.toLowerCase() } : {}),
          ...(parsed.data.mobile !== undefined ? { mobile: parsed.data.mobile } : {}),
          ...(parsed.data.nationality !== undefined ? { nationality: parsed.data.nationality } : {}),
          ...(parsed.data.pipelineStatus !== undefined ? { pipelineStatus: parsed.data.pipelineStatus } : {}),
          ...(nextAdmissionStatus !== undefined ? { admissionStatus: nextAdmissionStatus } : {}),
        },
      });
    });

    return NextResponse.json({ lead });
  } catch (e) {
    console.error("consultant lead PATCH", e);
    return NextResponse.json({ error: "Could not update lead" }, { status: 500 });
  }
}
