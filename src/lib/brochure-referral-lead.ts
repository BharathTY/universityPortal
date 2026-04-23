import { AdmissionLeadStatus, LeadPipelineStatus } from "@prisma/client";
import { isAdmissionLeadRoleSlug } from "@/lib/admission-lead-role";
import { consultantCodeFromUserId } from "@/lib/consultant-code";
import { resolveAcademicYearIdForLead } from "@/lib/consultant-default-year";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";

export type BrochureReferralInput = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  referralFirstName?: string | null;
  referralLastName?: string | null;
  referralPhone?: string | null;
  referralEmail?: string | null;
};

export type BrochureReferralResult =
  | { ok: true; leadId: string }
  | { ok: false; status: number; error: string };

/**
 * Creates an admission lead for the batch owner’s primary university (same pipeline as partner leads).
 * Used by the public brochure / QR form (`/ref/[token]`).
 */
export async function createAdmissionLeadFromBrochureToken(
  token: string,
  input: BrochureReferralInput,
): Promise<BrochureReferralResult> {
  const batch = await prisma.batch.findFirst({
    where: { leadPunchToken: token },
    select: { id: true, title: true, ownerId: true },
  });
  if (!batch?.ownerId) {
    return { ok: false, status: 404, error: "Invalid or inactive referral link." };
  }

  const ownerId = batch.ownerId;

  const allowed = await getAllowedConsultantUniversityIds(ownerId);
  if (allowed.length === 0) {
    return {
      ok: false,
      status: 503,
      error: "This referral link is not available yet — the batch owner has no university assigned.",
    };
  }

  /** Prefer a linked university that already has academic years (name order among those only). */
  const universitiesWithYears = await prisma.university.findMany({
    where: {
      id: { in: allowed },
      academicYears: { some: {} },
    },
    orderBy: { name: "asc" },
    select: { id: true },
    take: 1,
  });
  const universityId = universitiesWithYears[0]?.id ?? null;
  if (!universityId) {
    return {
      ok: false,
      status: 503,
      error: "No linked university has an academic year configured — ask an administrator to add years.",
    };
  }

  const yearId = await resolveAcademicYearIdForLead(universityId, null);
  if (!yearId) {
    return {
      ok: false,
      status: 503,
      error: "This organisation has no academic year configured — ask an administrator to add one.",
    };
  }

  const stream = await prisma.stream.findFirst({
    where: { universityId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  if (!stream) {
    return {
      ok: false,
      status: 503,
      error: "This organisation has no program stream configured — ask an administrator to add one.",
    };
  }

  const ownerRoles = await prisma.userRole.findMany({
    where: { userId: ownerId },
    include: { role: { select: { id: true, slug: true } } },
  });
  const consultantRole = ownerRoles.find((ur) => isAdmissionLeadRoleSlug(ur.role.slug));
  if (!consultantRole) {
    return {
      ok: false,
      status: 503,
      error: "This referral link is not available — the batch owner cannot receive leads in the system.",
    };
  }

  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { branchName: true, name: true, email: true },
  });
  const assignedPartnerDisplayName = (owner?.name?.trim() || owner?.email?.trim() || "Admission partner").slice(0, 200);

  const email = input.email.trim().toLowerCase();
  const dup = await prisma.admissionLead.findFirst({
    where: { universityId, email },
  });
  if (dup) {
    return { ok: false, status: 409, error: "A lead with this email is already registered for this university." };
  }

  let referralEmail: string | null = null;
  const refE = input.referralEmail?.trim();
  if (refE) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(refE);
    if (!ok) {
      return { ok: false, status: 400, error: "Invalid referrer email." };
    }
    referralEmail = refE.toLowerCase();
  }

  const admissionState = `Brochure QR — ${batch.title}`.slice(0, 120);

  const lead = await prisma.admissionLead.create({
    data: {
      universityId,
      academicYearId: yearId,
      streamId: stream.id,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      mobile: input.mobile.trim(),
      consultantCode: consultantCodeFromUserId(ownerId),
      consultantRoleId: consultantRole.roleId,
      admissionStatus: AdmissionLeadStatus.NEW,
      pipelineStatus: LeadPipelineStatus.NEW,
      nationality: null,
      specialization: "Brochure / QR referral",
      admissionState,
      referralFirstName: input.referralFirstName?.trim() || null,
      referralLastName: input.referralLastName?.trim() || null,
      referralPhone: input.referralPhone?.trim() || null,
      referralEmail,
      branchName: owner?.branchName?.trim() || null,
      createdByUserId: ownerId,
      batchId: batch.id,
      assignedPartnerDisplayName,
    },
  });

  return { ok: true, leadId: lead.id };
}
