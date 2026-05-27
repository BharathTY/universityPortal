import type { AdmissionLeadStatus, Prisma } from "@prisma/client";
import {
  isPaidLeadStatus,
  isReadyToPayStatus,
  isRejectedLeadStatus,
  leadAgeingDays,
  leadStatusLabel,
} from "@/lib/lead-status";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";

export type ConsultantLeadsSummary = {
  total: number;
  newLeads: number;
  readyToPay: number;
  paid: number;
  rejected: number;
};

export type ConsultantLeadFilterOption = { id: string; label: string };

export type ConsultantLeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  universityName: string;
  universityId: string;
  streamName: string;
  registrationFee: number | null;
  ageingDays: string;
  status: string;
  statusRaw: AdmissionLeadStatus;
  createdAt: Date;
};

export type ConsultantLeadsSort = "latest" | "oldest" | "name" | "university";

export type ConsultantLeadsQuery = {
  q?: string;
  universityId?: string;
  streamId?: string;
  status?: AdmissionLeadStatus;
  createdFrom?: string;
  createdTo?: string;
  sort?: ConsultantLeadsSort;
  page?: number;
  pageSize?: number;
};

export type ConsultantLeadsListResult = {
  leads: ConsultantLeadRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const leadInclude = {
  university: { select: { id: true, name: true, registrationFee: true } },
  stream: { select: { name: true } },
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

function buildLeadWhere(
  query: ConsultantLeadsQuery,
  base: Prisma.AdmissionLeadWhereInput,
): Prisma.AdmissionLeadWhereInput {
  const filters: Prisma.AdmissionLeadWhereInput = { ...base };

  if (query.universityId) filters.universityId = query.universityId;
  if (query.streamId) filters.streamId = query.streamId;
  if (query.status) filters.admissionStatus = query.status;

  const from = parseDateStart(query.createdFrom);
  const to = parseDateEnd(query.createdTo);
  if (from || to) {
    filters.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const q = query.q?.trim();
  if (q) {
    filters.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { mobile: { contains: q } },
    ];
  }

  return filters;
}

function buildLeadOrderBy(sort: ConsultantLeadsSort | undefined): Prisma.AdmissionLeadOrderByWithRelationInput[] {
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

function mapLeadRow(row: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  admissionStatus: AdmissionLeadStatus;
  createdAt: Date;
  university: { id: string; name: string; registrationFee: Prisma.Decimal | null };
  stream: { name: string };
}): ConsultantLeadRow {
  const fee = row.university.registrationFee != null ? Number(String(row.university.registrationFee)) : null;
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    mobile: row.mobile,
    universityName: row.university.name,
    universityId: row.university.id,
    streamName: row.stream.name,
    registrationFee: Number.isFinite(fee) ? fee : null,
    ageingDays: leadAgeingDays(row.createdAt),
    status: leadStatusLabel(row.admissionStatus),
    statusRaw: row.admissionStatus,
    createdAt: row.createdAt,
  };
}

async function consultantBaseWhere(userId: string): Promise<Prisma.AdmissionLeadWhereInput | null> {
  const allowed = await getAllowedConsultantUniversityIds(userId);
  if (allowed.length === 0) return null;
  return {
    createdByUserId: userId,
    universityId: { in: allowed },
  };
}

export async function getConsultantLeadsSummary(userId: string): Promise<ConsultantLeadsSummary> {
  const base = await consultantBaseWhere(userId);
  if (!base) return { total: 0, newLeads: 0, readyToPay: 0, paid: 0, rejected: 0 };

  const [total, newLeads, readyToPay, paid, rejected] = await Promise.all([
    prisma.admissionLead.count({ where: base }),
    prisma.admissionLead.count({ where: { ...base, admissionStatus: "NEW_LEAD" } }),
    prisma.admissionLead.count({ where: { ...base, admissionStatus: "READY_TO_PAY" } }),
    prisma.admissionLead.count({
      where: { ...base, admissionStatus: { in: ["PAYMENT_DONE", "ENROLLED"] } },
    }),
    prisma.admissionLead.count({
      where: { ...base, admissionStatus: { in: ["NOT_INTERESTED", "WRONG_NUMBER"] } },
    }),
  ]);
  return { total, newLeads, readyToPay, paid, rejected };
}

export async function getConsultantLeadsFilterOptions(userId: string): Promise<{
  universities: ConsultantLeadFilterOption[];
  streams: ConsultantLeadFilterOption[];
}> {
  const allowed = await getAllowedConsultantUniversityIds(userId);
  if (allowed.length === 0) {
    return { universities: [], streams: [] };
  }

  const [universities, streams] = await Promise.all([
    prisma.university.findMany({
      where: { id: { in: allowed } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.stream.findMany({
      where: { universityId: { in: allowed } },
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

export async function listConsultantLeads(
  userId: string,
  query: ConsultantLeadsQuery = {},
): Promise<ConsultantLeadsListResult> {
  const base = await consultantBaseWhere(userId);
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, query.pageSize ?? 25));

  if (!base) {
    return { leads: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const where = buildLeadWhere(query, base);
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

export function parseConsultantLeadsQueryFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): ConsultantLeadsQuery {
  const one = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v.trim() : undefined;
  };
  const statusRaw = one("status");
  const sortRaw = one("sort");
  const sort: ConsultantLeadsSort | undefined =
    sortRaw === "oldest" || sortRaw === "name" || sortRaw === "university" || sortRaw === "latest"
      ? sortRaw
      : sortRaw
        ? undefined
        : "latest";

  return {
    q: one("q"),
    universityId: one("universityId"),
    streamId: one("streamId"),
    status: (statusRaw as AdmissionLeadStatus) || undefined,
    createdFrom: one("createdFrom"),
    createdTo: one("createdTo"),
    sort: sort ?? "latest",
    page: Math.max(1, Number(one("page") ?? "1") || 1),
    pageSize: Math.min(100, Math.max(10, Number(one("pageSize") ?? "25") || 25)),
  };
}

export { isPaidLeadStatus, isReadyToPayStatus, isRejectedLeadStatus };
