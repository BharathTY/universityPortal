import {
  AdmissionReviewStatus,
  ApplicationPaymentStatus,
  ApplicationStatus,
  LeadPipelineStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { sendStudentRegistrationEmail } from "@/lib/email";
import { requireConsultantUniversity } from "@/lib/consultant-api";

type Ctx = { params: Promise<{ id: string }> };

/** Creates a student user + application from a lead (consultant-owned). */
export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireConsultantUniversity();
  if (!gate.ok) return gate.response;
  const { session, universityId } = gate;
  const { id: leadId } = await ctx.params;

  const lead = await prisma.admissionLead.findFirst({
    where: { id: leadId, universityId, createdByUserId: session.sub },
    include: {
      university: { select: { name: true } },
      stream: { select: { name: true } },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (lead.pipelineStatus !== LeadPipelineStatus.NEW) {
    return NextResponse.json({ error: "Lead is not eligible for conversion" }, { status: 400 });
  }

  const email = lead.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists. Use invite flow or another email." },
      { status: 409 },
    );
  }

  const studentRole = await prisma.role.findUnique({ where: { slug: ROLES.student } });
  if (!studentRole) {
    return NextResponse.json({ error: "Student role not configured" }, { status: 500 });
  }

  const batch = await prisma.batch.findFirst({
    where: { ownerId: session.sub },
    orderBy: { createdAt: "desc" },
  });

  const fullName = `${lead.firstName} ${lead.lastName}`.trim();

  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.user.create({
      data: {
        email,
        name: fullName,
        phone: lead.mobile,
        universityId,
        studentOfId: session.sub,
        inviteToken: null,
        inviteAcceptedAt: new Date(),
        accountStatus: "ACTIVE",
        roles: { create: { roleId: studentRole.id } },
      },
    });

    const application = await tx.application.create({
      data: {
        userId: student.id,
        universityId,
        batchId: batch?.id ?? null,
        leadId: lead.id,
        status: ApplicationStatus.REGISTRATION_FEE_PENDING,
        paymentStatus: ApplicationPaymentStatus.REGISTRATION_PENDING,
        admissionReview: AdmissionReviewStatus.PENDING,
      },
    });

    await tx.admissionLead.update({
      where: { id: lead.id },
      data: { pipelineStatus: LeadPipelineStatus.CONVERTED },
    });

    return { student, application };
  });

  try {
    await sendStudentRegistrationEmail({
      to: email,
      name: fullName,
      applicationId: result.application.id,
      universityName: lead.university.name,
      courseName: lead.stream.name,
    });
  } catch (e) {
    console.error("sendStudentRegistrationEmail", e);
  }

  return NextResponse.json({
    ok: true,
    userId: result.student.id,
    applicationId: result.application.id,
  });
}
