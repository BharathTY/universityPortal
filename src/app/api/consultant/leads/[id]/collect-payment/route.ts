import { AdmissionLeadStatus, PaymentCollectedBy, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultant, isConsultantSpoc } from "@/lib/roles";

const bodySchema = z.object({
  paymentMethod: z.enum(["UPI", "CARD"]),
  upiId: z.string().max(120).trim().optional(),
  cardHolderName: z.string().max(120).trim().optional(),
  cardNumber: z.string().max(24).trim().optional(),
  cardExpiry: z.string().max(7).trim().optional(),
  cardCvv: z.string().max(4).trim().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

function paymentMethodLabel(data: z.infer<typeof bodySchema>): string {
  if (data.paymentMethod === "UPI") {
    return data.upiId ? `UPI (${data.upiId})` : "UPI";
  }
  const last4 = data.cardNumber?.replace(/\D/g, "").slice(-4);
  return last4 ? `Card (****${last4})` : "Card";
}

async function resolvePaymentAmount(universityId: string): Promise<Prisma.Decimal> {
  const uni = await prisma.university.findUnique({
    where: { id: universityId },
    select: { registrationFee: true, applicationFee: true },
  });
  const raw = uni?.registrationFee ?? uni?.applicationFee;
  const n = raw != null ? Number(String(raw)) : 0;
  return new Prisma.Decimal(Number.isFinite(n) && n > 0 ? n.toFixed(2) : "0.00");
}

export async function POST(req: Request, ctx: Ctx) {
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

  const { id: leadId } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const lead = await prisma.admissionLead.findFirst({
    where: {
      id: leadId,
      universityId: { in: allowed },
      createdByUserId: session.sub,
    },
    select: {
      id: true,
      admissionStatus: true,
      universityId: true,
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.admissionStatus !== AdmissionLeadStatus.READY_TO_PAY) {
    return NextResponse.json({ error: "Lead must be in Ready to Pay status" }, { status: 400 });
  }

  const amount = await resolvePaymentAmount(lead.universityId);
  const collectedBy: PaymentCollectedBy = isConsultantSpoc(session.roles) ? "SPOC" : "CONSULTANT";
  const methodLabel = paymentMethodLabel(parsed.data);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const pending = await tx.leadPayment.findFirst({
        where: { leadId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });

      const payment = pending
        ? await tx.leadPayment.update({
            where: { id: pending.id },
            data: {
              status: "SUCCESS",
              amount,
              collectedBy,
              collectedByUserId: session.sub,
              paymentMethod: methodLabel,
            },
          })
        : await tx.leadPayment.create({
            data: {
              leadId,
              amount,
              status: "SUCCESS",
              collectedBy,
              collectedByUserId: session.sub,
              paymentMethod: methodLabel,
            },
          });

      if (lead.admissionStatus !== AdmissionLeadStatus.PAYMENT_DONE) {
        await tx.admissionLeadStatusHistory.create({
          data: {
            leadId,
            fromStatus: lead.admissionStatus,
            toStatus: AdmissionLeadStatus.PAYMENT_DONE,
            changedByUserId: session.sub,
          },
        });
      }

      const updatedLead = await tx.admissionLead.update({
        where: { id: leadId },
        data: { admissionStatus: AdmissionLeadStatus.PAYMENT_DONE },
      });

      return { payment, lead: updatedLead };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("collect-payment", e);
    return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
  }
}
