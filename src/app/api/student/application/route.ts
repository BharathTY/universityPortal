import { ApplicationStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { replaceLeadEntranceExams } from "@/lib/consultant-lead-payload";
import { getStudentApplication, listStudentApplications } from "@/lib/student-application-data";
import { syncStudentApplicationsForUser } from "@/lib/ensure-student-for-lead";
import { buildStudentProfileUpdates } from "@/lib/student-application-save";
import {
  type StudentProfileFormValues,
  validateStudentProfileSubmit,
} from "@/lib/student-lead-prefill";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";
import { isRazorpayConfigured } from "@/lib/razorpay-server";

const entranceExamSchema = z.object({
  clientId: z.string().optional(),
  examName: z.string().max(120),
  centreName: z.string().max(200),
  registrationNumber: z.string().max(64).optional().nullable(),
  scoreRank: z.string().max(64),
  examYear: z.string().max(4),
});

const profileSchema = z.object({
  applicationId: z.string().min(1),
  submitProfile: z.boolean().optional(),
  studentTitle: z.string().max(32).optional().nullable(),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  gender: z.string().max(32).optional().nullable(),
  dateOfBirth: z.string().max(32).optional().nullable(),
  category: z.string().max(120).optional().nullable(),
  caste: z.string().max(120).optional().nullable(),
  religion: z.string().max(120).optional().nullable(),
  nationality: z.string().max(120).optional().nullable(),
  mobile: z.string().min(5).max(32),
  guardianName: z.string().max(120).optional().nullable(),
  guardianMobile: z.string().max(32).optional().nullable(),
  uidaiNumber: z.string().max(12).optional().nullable(),
  abcApaarId: z.string().max(64).optional().nullable(),
  admissionState: z.string().max(120).optional().nullable(),
  addressLine1: z.string().max(500).optional().nullable(),
  addressLine2: z.string().max(500).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  district: z.string().max(120).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  pincode: z.string().max(12).optional().nullable(),
  correspondenceAddress: z.string().max(1000).optional().nullable(),
  sslcSchool: z.string().max(200).optional().nullable(),
  sslcBoard: z.string().max(120).optional().nullable(),
  sslcYear: z.string().max(4).optional().nullable(),
  sslcResultType: z.string().max(32).optional().nullable(),
  sslcPercent: z.string().optional().nullable(),
  qualificationType: z.string().max(32).optional().nullable(),
  qualInstitution: z.string().max(200).optional().nullable(),
  qualBoardUniversity: z.string().max(200).optional().nullable(),
  qualYear: z.string().max(4).optional().nullable(),
  qualResultType: z.string().max(32).optional().nullable(),
  qualScore: z.string().optional().nullable(),
  priorDegreeType: z.string().max(120).optional().nullable(),
  priorDegreeName: z.string().max(200).optional().nullable(),
  priorDegreeStream: z.string().max(200).optional().nullable(),
  priorDegreeCollege: z.string().max(200).optional().nullable(),
  priorDegreeUniversity: z.string().max(200).optional().nullable(),
  priorDegreeYear: z.string().max(4).optional().nullable(),
  priorDegreeResultType: z.string().max(32).optional().nullable(),
  priorDegreeScore: z.string().optional().nullable(),
  hasEntranceExams: z.boolean().optional(),
  entranceExams: z.array(entranceExamSchema).optional(),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const applicationId = url.searchParams.get("applicationId");

  await syncStudentApplicationsForUser({ userId: session.sub, email: session.email });

  const [applications, application] = await Promise.all([
    listStudentApplications(session.sub),
    getStudentApplication(session.sub, applicationId),
  ]);

  return NextResponse.json({
    applications: applications.map((a) => ({
      id: a.id,
      referenceCode: a.referenceCode,
      universityName: a.university?.name ?? "University",
      universityCode: a.university?.code ?? "",
      programmeName: a.lead?.stream.name ?? "Programme",
    })),
    application,
    razorpayConfigured: isRazorpayConfigured(),
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const application = await prisma.application.findFirst({
    where: { id: parsed.data.applicationId, userId: session.sub },
    select: { id: true, leadId: true, status: true },
  });
  if (!application?.leadId) {
    return NextResponse.json({ error: "No application" }, { status: 404 });
  }

  const current = await getStudentApplication(session.sub, application.id);
  if (!current?.profile) {
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
  }

  const formValues = parsed.data as StudentProfileFormValues & { applicationId: string };
  const profileForValidation = {
    ...current.profile,
    ...formValues,
    email: current.profile.email,
    universityName: current.profile.universityName,
    programType: current.profile.programType,
    degreeType: current.profile.degreeType,
    programName: current.profile.programName,
    academicYear: current.profile.academicYear,
    photoUrl: current.profile.photoUrl,
    sslcMarksCardUrl: current.profile.sslcMarksCardUrl,
    qualMarksCardUrl: current.profile.qualMarksCardUrl,
  };

  if (parsed.data.submitProfile) {
    const fieldErrors = validateStudentProfileSubmit(profileForValidation);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: "Please complete all mandatory fields", fieldErrors }, { status: 400 });
    }
  }

  const updates = buildStudentProfileUpdates(formValues);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: session.sub }, data: updates.user });
    await tx.admissionLead.update({ where: { id: application.leadId! }, data: updates.lead });
    await replaceLeadEntranceExams(
      tx,
      application.leadId!,
      Boolean(formValues.hasEntranceExams),
      updates.entranceExams.map((e) => ({
        examName: e.examName,
        centreName: e.centreName,
        registrationNumber: e.registrationNumber,
        scoreRank: e.scoreRank,
        examYear: e.examYear,
      })),
    );
    if (parsed.data.submitProfile) {
      await tx.application.update({
        where: { id: application.id },
        data: { status: ApplicationStatus.APPLICATION_DETAILS_PENDING },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
