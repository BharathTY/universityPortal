import { PaymentCollectedBy } from "@prisma/client";
import { completeConsultantLeadPayment } from "@/lib/consultant-lead-payment";
import { resolveLeadRegistrationFeeRupeesFromRow } from "@/lib/lead-registration-fee";
import { resolveUniversityPaymentUpiId } from "@/lib/university-payment-upi";
import { prisma } from "@/lib/prisma";

export async function getLeadUpiPaymentPublicInfo(leadId: string) {
  const lead = await prisma.admissionLead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionStatus: true,
      university: {
        select: { name: true, applicationFee: true, paymentUpiId: true },
      },
      stream: { select: { name: true, applicationFee: true } },
    },
  });

  if (!lead) return null;

  const amountRupees = resolveLeadRegistrationFeeRupeesFromRow(lead);
  const upiId = resolveUniversityPaymentUpiId(lead.university.paymentUpiId);

  return {
    leadId: lead.id,
    studentName: `${lead.firstName} ${lead.lastName}`.trim(),
    universityName: lead.university.name,
    streamName: lead.stream.name,
    admissionStatus: lead.admissionStatus,
    amountRupees,
    upiId,
  };
}

export async function completeLeadUpiPaymentFromShareLink(params: {
  leadId: string;
  upiId: string;
}) {
  const lead = await prisma.admissionLead.findUnique({
    where: { id: params.leadId },
    select: {
      createdByUserId: true,
      application: { select: { userId: true } },
    },
  });

  if (!lead) {
    return { ok: false as const, status: 404, error: "Lead not found" };
  }

  const userId = lead.application?.userId ?? lead.createdByUserId;

  return completeConsultantLeadPayment({
    leadId: params.leadId,
    userId,
    roles: [],
    collectedBy: PaymentCollectedBy.STUDENT,
    paymentMethod: `Student paid university UPI (${params.upiId})`,
  });
}
