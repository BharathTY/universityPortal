import {
  AdmissionLeadStatus,
  ApplicationPaymentStatus,
  ApplicationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isApplicationFullyPaid } from "@/lib/student-portal";

export async function recordApplicationPayment(params: {
  applicationId: string;
  userId: string;
  amountRupees: number;
  paymentMethod: string;
  leadId: string | null;
  applicationFee: number;
  paidBefore: number;
}) {
  const { applicationId, userId, amountRupees, paymentMethod, leadId, applicationFee, paidBefore } =
    params;
  const paidAfter = paidBefore + amountRupees;
  const fullyPaid = isApplicationFullyPaid(applicationFee, paidAfter);

  await prisma.$transaction(async (tx) => {
    if (leadId) {
      await tx.leadPayment.create({
        data: {
          leadId,
          amount: amountRupees,
          status: "SUCCESS",
          collectedBy: "STUDENT",
          collectedByUserId: userId,
          paymentMethod,
        },
      });

      if (fullyPaid) {
        await tx.admissionLead.update({
          where: { id: leadId },
          data: { admissionStatus: AdmissionLeadStatus.PAYMENT_DONE },
        });
      }
    }

    await tx.application.update({
      where: { id: applicationId },
      data: {
        lastRazorpayOrderId: null,
        paymentStatus: fullyPaid
          ? ApplicationPaymentStatus.REGISTRATION_PAID
          : ApplicationPaymentStatus.REGISTRATION_PENDING,
        status: fullyPaid
          ? ApplicationStatus.PROGRAM_FEE_PENDING
          : ApplicationStatus.REGISTRATION_FEE_PENDING,
      },
    });
  });
}
