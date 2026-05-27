import type { AdmissionLeadStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { ADMISSION_PARTNER_ROLE_SLUGS } from "@/lib/admission-partner-slugs";
import { leadAgeingDays, leadStatusLabel } from "@/lib/lead-status";
import { prisma } from "@/lib/prisma";

export type MasterDashboardCounts = {
  totalUniversities: number;
  totalConsultants: number;
  totalLeads: number;
  readyToPay: number;
  paidStudents: number;
  availableSeats: number;
  filledSeats: number;
};

export type RecentUniversityOnboarding = {
  id: string;
  name: string;
  state: string | null;
  district: string | null;
  createdAt: Date;
};

export type RecentStudentLead = {
  id: string;
  name: string;
  email: string;
  universityName: string;
  consultantName: string | null;
  ageingDays: string;
  status: string;
  statusRaw: AdmissionLeadStatus;
  createdAt: Date;
};

export type MasterDashboardSnapshot = {
  counts: MasterDashboardCounts;
  recentUniversities: RecentUniversityOnboarding[];
  recentLeads: RecentStudentLead[];
};

function partnerRoleWhere() {
  return {
    roles: { some: { role: { slug: { in: [...ADMISSION_PARTNER_ROLE_SLUGS] } } } },
  };
}

/** Aggregate counts for the master admin dashboard. */
export async function getMasterDashboardCounts(): Promise<MasterDashboardCounts> {
  const [totalUniversities, totalConsultants, totalLeads, readyToPay, paidStudents, streamSeats] =
    await Promise.all([
      prisma.university.count(),
      prisma.user.count({ where: partnerRoleWhere() }),
      prisma.admissionLead.count(),
      prisma.admissionLead.count({ where: { admissionStatus: "READY_TO_PAY" } }),
      prisma.admissionLead.count({
        where: {
          admissionStatus: { in: ["PAYMENT_DONE", "ENROLLED"] },
        },
      }),
      prisma.stream.aggregate({
        _sum: { totalSeats: true, filledSeats: true },
      }),
    ]);

  const totalSeatCapacity = streamSeats._sum.totalSeats ?? 0;
  const filledSeats = streamSeats._sum.filledSeats ?? 0;

  return {
    totalUniversities,
    totalConsultants,
    totalLeads,
    readyToPay,
    paidStudents,
    availableSeats: Math.max(0, totalSeatCapacity - filledSeats),
    filledSeats,
  };
}

/** Latest onboarded universities (name, state, district). */
export async function getRecentUniversityOnboarding(
  limit = 5,
): Promise<RecentUniversityOnboarding[]> {
  const rows = await prisma.university.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      state: true,
      district: true,
      createdAt: true,
    },
  });
  return rows;
}

function mapRecentLead(row: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  admissionStatus: AdmissionLeadStatus;
  createdAt: Date;
  university: { name: string };
  createdBy: { name: string | null } | null;
}): RecentStudentLead {
  const name = `${row.firstName} ${row.lastName}`.trim();
  return {
    id: row.id,
    name,
    email: row.email,
    universityName: row.university.name,
    consultantName: row.createdBy?.name ?? null,
    ageingDays: leadAgeingDays(row.createdAt),
    status: leadStatusLabel(row.admissionStatus),
    statusRaw: row.admissionStatus,
    createdAt: row.createdAt,
  };
}

/** Latest student leads across all universities. */
export async function getRecentStudentLeads(limit = 10): Promise<RecentStudentLead[]> {
  const rows = await prisma.admissionLead.findMany({
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
      createdBy: { select: { name: true } },
    },
  });
  return rows.map(mapRecentLead);
}

/** Full master dashboard payload in one round trip. */
export async function getMasterDashboardSnapshot(): Promise<MasterDashboardSnapshot> {
  try {
    const [counts, recentUniversities, recentLeads] = await Promise.all([
      getMasterDashboardCounts(),
      getRecentUniversityOnboarding(),
      getRecentStudentLeads(),
    ]);
    return { counts, recentUniversities, recentLeads };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return {
        counts: {
          totalUniversities: 0,
          totalConsultants: 0,
          totalLeads: 0,
          readyToPay: 0,
          paidStudents: 0,
          availableSeats: 0,
          filledSeats: 0,
        },
        recentUniversities: [],
        recentLeads: [],
      };
    }
    throw e;
  }
}
