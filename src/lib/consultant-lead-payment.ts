import {
  AdmissionLeadStatus,
  ApplicationPaymentStatus,
  ApplicationStatus,
  PaymentCollectedBy,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveLeadRegistrationFeeRupeesFromRow } from "@/lib/lead-registration-fee";
import { splitAmountFields, formatSplitSummary } from "@/lib/payment-split-db";
import { isConsultantSpoc } from "@/lib/roles";

export async function resolveLeadRegistrationFeeRupees(leadId: string): Promise<Prisma.Decimal> {
  const lead = await prisma.admissionLead.findUnique({
    where: { id: leadId },
    select: {
      stream: {
        select: {
          applicationFee: true,
          streamFee: true,
          tuitionYear1: true,
          collegeFee: true,
        },
      },
      university: { select: { registrationFee: true, applicationFee: true } },
    },
  });
  if (!lead) return new Prisma.Decimal("0.00");
  const n = resolveLeadRegistrationFeeRupeesFromRow(lead);
  return new Prisma.Decimal(n > 0 ? n.toFixed(2) : "0.00");
}

type CompleteLeadPaymentInput = {
  leadId: string;
  userId: string;
  roles: string[];
  paymentMethod: string;
  amount?: Prisma.Decimal;
};

export async function completeConsultantLeadPayment(input: CompleteLeadPaymentInput) {
  const lead = await prisma.admissionLead.findUnique({
    where: { id: input.leadId },
    select: {
      id: true,
      admissionStatus: true,
      universityId: true,
      application: { select: { id: true } },
    },
  });

  if (!lead) {
    return { ok: false as const, status: 404, error: "Lead not found" };
  }

  if (lead.admissionStatus !== AdmissionLeadStatus.READY_TO_PAY) {
    return { ok: false as const, status: 400, error: "Lead must be in Ready to Pay status" };
  }

  const amount = input.amount ?? (await resolveLeadRegistrationFeeRupees(input.leadId));
  const amountNum = Number(String(amount));
  const shares = splitAmountFields(amountNum);
  const methodWithSplit = `${input.paymentMethod} · ${formatSplitSummary(amountNum)}`;
  const collectedBy: PaymentCollectedBy = isConsultantSpoc(input.roles) ? "SPOC" : "CONSULTANT";

  const result = await prisma.$transaction(async (tx) => {
    const pending = await tx.leadPayment.findFirst({
      where: { leadId: input.leadId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    const payment = pending
      ? await tx.leadPayment.update({
          where: { id: pending.id },
          data: {
            status: "SUCCESS",
            amount,
            universityShare: shares.universityShare,
            platformShare: shares.platformShare,
            collectedBy,
            collectedByUserId: input.userId,
            paymentMethod: methodWithSplit,
          },
        })
      : await tx.leadPayment.create({
          data: {
            leadId: input.leadId,
            amount,
            universityShare: shares.universityShare,
            platformShare: shares.platformShare,
            status: "SUCCESS",
            collectedBy,
            collectedByUserId: input.userId,
            paymentMethod: methodWithSplit,
          },
        });

    if (lead.admissionStatus !== AdmissionLeadStatus.PAYMENT_DONE) {
      await tx.admissionLeadStatusHistory.create({
        data: {
          leadId: input.leadId,
          fromStatus: lead.admissionStatus,
          toStatus: AdmissionLeadStatus.PAYMENT_DONE,
          changedByUserId: input.userId,
        },
      });
    }

    const updatedLead = await tx.admissionLead.update({
      where: { id: input.leadId },
      data: { admissionStatus: AdmissionLeadStatus.PAYMENT_DONE },
    });

    if (lead.application?.id) {
      await tx.application.update({
        where: { id: lead.application.id },
        data: {
          paymentStatus: ApplicationPaymentStatus.REGISTRATION_PAID,
          status: ApplicationStatus.PROGRAM_FEE_PENDING,
        },
      });
    }

    return { payment, lead: updatedLead };
  });

  return { ok: true as const, result };
}
