import type { AdmissionLeadStatus, Prisma } from "@prisma/client";
import {
  isPaidLeadStatus,
  isReadyToPayStatus,
  isRejectedLeadStatus,
  leadAgeingDays,
  leadStatusLabel,
} from "@/lib/lead-status";
import { prisma } from "@/lib/prisma";

export type MasterLeadsSummary = {
  total: number;
  newLeads: number;
  readyToPay: number;
  paid: number;
  rejected: number;
};

export type MasterLeadFilterOption = { id: string; label: string };

export type MasterLeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  universityName: string;
  streamName: string;
  consultantCompany: string | null;
  consultantSpocName: string | null;
  paymentStatus: "Paid" | "Pending";
  ageingDays: string;
  status: string;
  statusRaw: AdmissionLeadStatus;
  createdAt: Date;
};

export type MasterLeadsSort = "latest" | "oldest" | "name" | "university";

export type MasterLeadsQuery = {
  q?: string;
  universityId?: string;
  streamId?: string;
  status?: AdmissionLeadStatus;
  createdFrom?: string;
  createdTo?: string;
  sort?: MasterLeadsSort;
  page?: number;
  pageSize?: number;
};

export type MasterLeadsListResult = {
  leads: MasterLeadRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const leadInclude = {
  university: { select: { name: true } },
  stream: { select: { name: true } },
  createdBy: { select: { name: true, companyName: true } },
  payments: { where: { status: "SUCCESS" as const }, select: { id: true }, take: 1 },
} satisfies Prisma.AdmissionLeadInclude;

function parseDateStart(iso: string | undefined): Date | undefined {
  if (!iso?.trim()) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseDateEnd(iso: string | undefined): Date | undefined {
  if (!iso?.trim()) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildLeadWhere(query: MasterLeadsQuery): Prisma.AdmissionLeadWhereInput {
  const where: Prisma.AdmissionLeadWhereInput = {};

  if (query.universityId) where.universityId = query.universityId;
  if (query.streamId) where.streamId = query.streamId;
  if (query.status) where.admissionStatus = query.status;

  const from = parseDateStart(query.createdFrom);
  const to = parseDateEnd(query.createdTo);
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { mobile: { contains: q } },
    ];
  }

  return where;
}

function buildLeadOrderBy(sort: MasterLeadsSort | undefined): Prisma.AdmissionLeadOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }];
    case "name":
      return [{ lastName: "asc" }, { firstName: "asc" }];
    case "university":
      return [{ university: { name: "asc" } }, { createdAt: "desc" }];
    case "latest":
    default:
      return [{ createdAt: "desc" }];
  }
}

function mapLeadPaymentStatus(
  admissionStatus: AdmissionLeadStatus,
  hasSuccessfulPayment: boolean,
): "Paid" | "Pending" {
  if (isPaidLeadStatus(admissionStatus) || hasSuccessfulPayment) return "Paid";
  return "Pending";
}

function mapLeadRow(row: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  admissionStatus: AdmissionLeadStatus;
  createdAt: Date;
  university: { name: string };
  stream: { name: string };
  createdBy: { name: string | null; companyName: string | null } | null;
  payments: { id: string }[];
}): MasterLeadRow {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    mobile: row.mobile,
    universityName: row.university.name,
    streamName: row.stream.name,
    consultantCompany: row.createdBy?.companyName?.trim() || null,
    consultantSpocName: row.createdBy?.name?.trim() || null,
    paymentStatus: mapLeadPaymentStatus(row.admissionStatus, row.payments.length > 0),
    ageingDays: leadAgeingDays(row.createdAt),
    status: leadStatusLabel(row.admissionStatus),
    statusRaw: row.admissionStatus,
    createdAt: row.createdAt,
  };
}

/** Summary card counts for the master leads list. */
export async function getMasterLeadsSummary(): Promise<MasterLeadsSummary> {
  const [total, newLeads, readyToPay, paid, rejected] = await Promise.all([
    prisma.admissionLead.count(),
    prisma.admissionLead.count({ where: { admissionStatus: "NEW_LEAD" } }),
    prisma.admissionLead.count({ where: { admissionStatus: "READY_TO_PAY" } }),
    prisma.admissionLead.count({
      where: { admissionStatus: { in: ["PAYMENT_DONE", "ENROLLED"] } },
    }),
    prisma.admissionLead.count({
      where: { admissionStatus: { in: ["NOT_INTERESTED", "WRONG_NUMBER"] } },
    }),
  ]);
  return { total, newLeads, readyToPay, paid, rejected };
}

/** Dropdown options for university and stream filters. */
export async function getMasterLeadsFilterOptions(): Promise<{
  universities: MasterLeadFilterOption[];
  streams: MasterLeadFilterOption[];
}> {
  const [universities, streams] = await Promise.all([
    prisma.university.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.stream.findMany({
      orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, university: { select: { code: true } } },
    }),
  ]);
  return {
    universities: universities.map((u) => ({
      id: u.id,
      label: `${u.name} (${u.code})`,
    })),
    streams: streams.map((s) => ({
      id: s.id,
      label: `${s.name} — ${s.university.code}`,
    })),
  };
}

/** Paginated master admin leads list with filters. */
export async function listMasterLeads(query: MasterLeadsQuery = {}): Promise<MasterLeadsListResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, query.pageSize ?? 25));
  const where = buildLeadWhere(query);
  const orderBy = buildLeadOrderBy(query.sort);

  const [total, rows] = await Promise.all([
    prisma.admissionLead.count({ where }),
    prisma.admissionLead.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: leadInclude,
    }),
  ]);

  return {
    leads: rows.map(mapLeadRow),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function parseMasterLeadsQueryFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): MasterLeadsQuery {
  const one = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v.trim() : undefined;
  };
  const statusRaw = one("status");
  const status = statusRaw as AdmissionLeadStatus | undefined;
  const sortRaw = one("sort");
  const sort: MasterLeadsSort | undefined =
    sortRaw === "oldest" || sortRaw === "name" || sortRaw === "university" || sortRaw === "latest"
      ? sortRaw
      : sortRaw
        ? undefined
        : "latest";

  return {
    q: one("q"),
    universityId: one("universityId"),
    streamId: one("streamId"),
    status: status || undefined,
    createdFrom: one("createdFrom"),
    createdTo: one("createdTo"),
    sort: sort ?? "latest",
    page: Math.max(1, Number(one("page") ?? "1") || 1),
    pageSize: Math.min(100, Math.max(10, Number(one("pageSize") ?? "25") || 25)),
  };
}
