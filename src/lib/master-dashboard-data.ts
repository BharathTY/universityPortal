import { Prisma } from "@prisma/client";
import { ADMISSION_PARTNER_ROLE_SLUGS } from "@/lib/admission-partner-slugs";
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

export type MasterDashboardSnapshot = {
  counts: MasterDashboardCounts;
  recentUniversities: RecentUniversityOnboarding[];
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

/** Full master dashboard payload in one round trip. */
export async function getMasterDashboardSnapshot(): Promise<MasterDashboardSnapshot> {
  try {
    const [counts, recentUniversities] = await Promise.all([
      getMasterDashboardCounts(),
      getRecentUniversityOnboarding(),
    ]);
    return { counts, recentUniversities };
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
      };
    }
    throw e;
  }
}
