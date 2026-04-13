import { ApplicationStatus, Prisma } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicationWhereForSession } from "@/lib/application-scope";

export type ApplicationMetricRow = {
  id: string;
  label: string;
  value: number;
  highlight?: boolean;
};

const STATUS_ORDER: ApplicationStatus[] = [
  ApplicationStatus.APPLICATION_DETAILS_PENDING,
  ApplicationStatus.REGISTRATION_FEE_PENDING,
  ApplicationStatus.PROGRAM_FEE_PENDING,
  ApplicationStatus.APPLICANT_KYC_PENDING,
  ApplicationStatus.PERSONAL_DETAILS_PENDING,
  ApplicationStatus.EDUCATION_DETAILS_PENDING,
  ApplicationStatus.DOCUMENTS_PENDING,
  ApplicationStatus.UNDER_L1_VERIFICATION,
  ApplicationStatus.UNDER_L2_VERIFICATION,
  ApplicationStatus.REJECTED,
  ApplicationStatus.COMPLETED,
];

const LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.APPLICATION_DETAILS_PENDING]: "Application Details Pending",
  [ApplicationStatus.REGISTRATION_FEE_PENDING]: "Registration Fee Pending",
  [ApplicationStatus.PROGRAM_FEE_PENDING]: "Program Fee Pending",
  [ApplicationStatus.APPLICANT_KYC_PENDING]: "Applicant KYC Pending",
  [ApplicationStatus.PERSONAL_DETAILS_PENDING]: "Personal Details Pending",
  [ApplicationStatus.EDUCATION_DETAILS_PENDING]: "Education Details Pending",
  [ApplicationStatus.DOCUMENTS_PENDING]: "Documents Pending",
  [ApplicationStatus.UNDER_L1_VERIFICATION]: "Under L1 Verification",
  [ApplicationStatus.UNDER_L2_VERIFICATION]: "Under L2 Verification",
  [ApplicationStatus.REJECTED]: "Rejected Applications",
  [ApplicationStatus.COMPLETED]: "Completed Applications",
};

export async function getApplicationMetrics(
  session: SessionPayload,
): Promise<{ rows: ApplicationMetricRow[]; setupMessage: string | null }> {
  const base = applicationWhereForSession(session);
  try {
    const total = await prisma.application.count({ where: base });
    const byStatus = await prisma.application.groupBy({
      by: ["status"],
      where: base,
      _count: { _all: true },
    });
    const countMap = new Map<ApplicationStatus, number>();
    for (const s of STATUS_ORDER) countMap.set(s, 0);
    for (const row of byStatus) {
      countMap.set(row.status as ApplicationStatus, row._count._all);
    }

    const rows: ApplicationMetricRow[] = [
      { id: "total", label: "Total Applications", value: total, highlight: true },
      ...STATUS_ORDER.map((status) => ({
        id: status,
        label: LABELS[status],
        value: countMap.get(status) ?? 0,
      })),
    ];
    return { rows, setupMessage: null };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return {
        rows: [],
        setupMessage:
          "Application tables are missing. From the project folder run: npx prisma db push && npm run db:seed",
      };
    }
    throw e;
  }
}
