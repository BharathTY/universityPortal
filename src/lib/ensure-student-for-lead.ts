import {
  AdmissionReviewStatus,
  ApplicationPaymentStatus,
  ApplicationStatus,
  LeadPipelineStatus,
} from "@prisma/client";
import { nextApplicationReferenceCode } from "@/lib/application-reference";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { sendStudentRegistrationEmail } from "@/lib/email";

type EnsureStudentResult =
  | { ok: true; created: boolean; applicationId: string | null; userId: string | null }
  | { ok: false; error: string };

/** Ensures the lead has a student user + application so they can pay via the student portal. */
export async function ensureStudentApplicationForLead(params: {
  leadId: string;
  consultantUserId: string;
}): Promise<EnsureStudentResult> {
  const lead = await prisma.admissionLead.findUnique({
    where: { id: params.leadId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      mobile: true,
      universityId: true,
      batchId: true,
      pipelineStatus: true,
      application: { select: { id: true, userId: true } },
      university: { select: { name: true, code: true } },
      stream: { select: { name: true } },
    },
  });

  if (!lead) {
    return { ok: false, error: "Lead not found" };
  }

  if (lead.application) {
    return {
      ok: true,
      created: false,
      applicationId: lead.application.id,
      userId: lead.application.userId,
    };
  }

  const email = lead.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    const linked = await prisma.application.findFirst({
      where: { userId: existingUser.id, leadId: lead.id },
      select: { id: true },
    });
    if (linked) {
      return { ok: true, created: false, applicationId: linked.id, userId: existingUser.id };
    }
    return {
      ok: false,
      error: "A user with this email already exists but is not linked to this lead.",
    };
  }

  const studentRole = await prisma.role.findUnique({ where: { slug: ROLES.student } });
  if (!studentRole) {
    return { ok: false, error: "Student role not configured" };
  }

  const batch =
    lead.batchId != null
      ? await prisma.batch.findFirst({
          where: { id: lead.batchId, ownerId: params.consultantUserId },
          select: { id: true, title: true },
        })
      : await prisma.batch.findFirst({
          where: { ownerId: params.consultantUserId },
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true },
        });

  const fullName = `${lead.firstName} ${lead.lastName}`.trim();

  const result = await prisma.$transaction(async (tx) => {
    const referenceCode = await nextApplicationReferenceCode(tx, lead.universityId, lead.university.code);

    const student = await tx.user.create({
      data: {
        email,
        name: fullName,
        phone: lead.mobile,
        universityId: lead.universityId,
        studentOfId: params.consultantUserId,
        inviteToken: null,
        inviteAcceptedAt: new Date(),
        accountStatus: "ACTIVE",
        roles: { create: { roleId: studentRole.id } },
      },
    });

    const application = await tx.application.create({
      data: {
        userId: student.id,
        universityId: lead.universityId,
        batchId: batch?.id ?? null,
        leadId: lead.id,
        referenceCode,
        status: ApplicationStatus.REGISTRATION_FEE_PENDING,
        paymentStatus: ApplicationPaymentStatus.REGISTRATION_PENDING,
        admissionReview: AdmissionReviewStatus.PENDING,
      },
    });

    if (lead.pipelineStatus === LeadPipelineStatus.NEW) {
      await tx.admissionLead.update({
        where: { id: lead.id },
        data: { pipelineStatus: LeadPipelineStatus.CONVERTED },
      });
    }

    return { student, application, batchTitle: batch?.title };
  });

  try {
    await sendStudentRegistrationEmail({
      to: email,
      name: fullName,
      universityName: lead.university.name,
      academicBatchName: result.batchTitle?.trim() || "Academic batch",
      degreeName: lead.stream.name,
    });
  } catch (e) {
    console.error("sendStudentRegistrationEmail", e);
  }

  return {
    ok: true,
    created: true,
    applicationId: result.application.id,
    userId: result.student.id,
  };
}
