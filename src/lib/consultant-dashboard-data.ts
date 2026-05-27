import type { AdmissionLeadStatus } from "@prisma/client";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { leadAgeingDays, leadStatusLabel } from "@/lib/lead-status";
import { prisma } from "@/lib/prisma";
import { aggregateSeatsForConsultant, type SeatSummary } from "@/lib/seats";

export type ConsultantDashboardCounts = {
  myLeads: number;
  assignedUniversities: number;
  pendingPayments: number;
  completedPayments: number;
};

export type ConsultantMouDocument = {
  id: string;
  fileName: string;
  fileUrl: string;
  academicYear: string;
  uploadedAt: Date;
};

export type ConsultantRecentLead = {
  id: string;
  name: string;
  email: string;
  universityName: string;
  status: string;
  statusRaw: AdmissionLeadStatus;
  ageingDays: string;
  createdAt: Date;
};

export type ConsultantDashboardSnapshot = {
  counts: ConsultantDashboardCounts;
  seatSummary: SeatSummary;
  mouDocuments: ConsultantMouDocument[];
  recentLeads: ConsultantRecentLead[];
};

/**
 * SPOCs inherit university assignments from their parent consultant (`reportsToConsultantId`).
 * MOU documents and seat totals use the same scope user.
 */
export async function resolveConsultantAssignmentUserId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { reportsToConsultantId: true },
  });
  return user?.reportsToConsultantId ?? userId;
}

/** Lead + payment counts for the signed-in consultant or SPOC. */
export async function getConsultantDashboardCounts(userId: string): Promise<ConsultantDashboardCounts> {
  const assignmentUserId = await resolveConsultantAssignmentUserId(userId);
  const [myLeads, universityIds, pendingPayments, completedPayments] = await Promise.all([
    prisma.admissionLead.count({ where: { createdByUserId: userId } }),
    getAllowedConsultantUniversityIds(assignmentUserId),
    prisma.leadPayment.count({
      where: {
        status: "PENDING",
        lead: { createdByUserId: userId },
      },
    }),
    prisma.leadPayment.count({
      where: {
        status: "SUCCESS",
        lead: { createdByUserId: userId },
      },
    }),
  ]);

  return {
    myLeads,
    assignedUniversities: universityIds.length,
    pendingPayments,
    completedPayments,
  };
}

/** Seat totals across streams on universities assigned to this consultant (or parent for SPOCs). */
export async function getConsultantSeatSummary(userId: string): Promise<SeatSummary> {
  const assignmentUserId = await resolveConsultantAssignmentUserId(userId);
  return aggregateSeatsForConsultant(assignmentUserId);
}

/** MOU uploads for the scoped consultant account. */
export async function getConsultantMouDocuments(userId: string): Promise<ConsultantMouDocument[]> {
  const assignmentUserId = await resolveConsultantAssignmentUserId(userId);
  const rows = await prisma.consultantDocument.findMany({
    where: { userId: assignmentUserId, kind: "MOU" },
    orderBy: [{ academicYear: "desc" }, { uploadedAt: "desc" }],
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      academicYear: true,
      uploadedAt: true,
    },
  });
  return rows;
}

function mapConsultantRecentLead(row: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  admissionStatus: AdmissionLeadStatus;
  createdAt: Date;
  university: { name: string };
}): ConsultantRecentLead {
  return {
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    email: row.email,
    universityName: row.university.name,
    status: leadStatusLabel(row.admissionStatus),
    statusRaw: row.admissionStatus,
    ageingDays: leadAgeingDays(row.createdAt),
    createdAt: row.createdAt,
  };
}

/** Latest leads created by this consultant or SPOC. */
export async function getConsultantRecentLeads(
  userId: string,
  limit = 5,
): Promise<ConsultantRecentLead[]> {
  const rows = await prisma.admissionLead.findMany({
    where: { createdByUserId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      admissionStatus: true,
      createdAt: true,
      university: { select: { name: true } },
    },
  });
  return rows.map(mapConsultantRecentLead);
}

/** Full consultant dashboard payload. */
export async function getConsultantDashboardSnapshot(
  userId: string,
): Promise<ConsultantDashboardSnapshot> {
  const [counts, seatSummary, mouDocuments, recentLeads] = await Promise.all([
    getConsultantDashboardCounts(userId),
    getConsultantSeatSummary(userId),
    getConsultantMouDocuments(userId),
    getConsultantRecentLeads(userId),
  ]);
  return { counts, seatSummary, mouDocuments, recentLeads };
}
