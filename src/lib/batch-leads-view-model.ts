import { Prisma } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { ensureBatchLeadPunchToken } from "@/lib/batch-lead-punch-token";
import { resolveConsultantActiveUniversityId } from "@/lib/consultant-universities";
import { leadOrderBy, leadTextSearchWhere, paginationMeta, parsePage, parsePageSize } from "@/lib/list-query";
import { prisma } from "@/lib/prisma";
import {
  canSeeAdmissionLeadAssignedPartnerName,
  isConsultant,
  isMaster,
  isUniversity,
} from "@/lib/roles";

export type BatchLeadsBulkConsultant = {
  universityName: string;
  universityCode: string;
  streams: { id: string; name: string }[];
};

export type BatchLeadListRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  admissionState: string | null;
  pipelineStatus: string;
  createdAt: string;
  /** Only populated for viewers allowed to see assigned partner names. */
  assignedPartnerDisplayName: string | null;
};

export type BatchLeadsQuery = {
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export async function loadBatchLeadsViewModel(
  batchId: string,
  session: SessionPayload,
  query: BatchLeadsQuery = {},
) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      title: true,
      code: true,
      ownerId: true,
      owner: { select: { universityId: true } },
    },
  });
  if (!batch) return { kind: "not-found" as const };

  const isOwner = batch.ownerId === session.sub;
  const sameOrgUniversityStaff =
    isUniversity(session.roles) &&
    !isMaster(session.roles) &&
    Boolean(session.universityId) &&
    batch.owner?.universityId === session.universityId;

  if (!isMaster(session.roles) && !isOwner && !sameOrgUniversityStaff) {
    return { kind: "forbidden" as const };
  }

  const token = await ensureBatchLeadPunchToken(batch.id);

  /** University used for bulk CSV (streams / API) — partner active uni, org staff JWT, or batch owner’s org for master. */
  let bulkUniversityId: string | null = null;
  if (isConsultant(session.roles)) {
    bulkUniversityId = (await resolveConsultantActiveUniversityId(session)).universityId;
  } else if (isUniversity(session.roles) && session.universityId) {
    bulkUniversityId = session.universityId;
  } else if (isMaster(session.roles) && batch.owner?.universityId) {
    bulkUniversityId = batch.owner.universityId;
  }

  let bulkConsultant: BatchLeadsBulkConsultant | null = null;
  if (bulkUniversityId) {
    const [university, streams] = await Promise.all([
      prisma.university.findUnique({
        where: { id: bulkUniversityId },
        select: { name: true, code: true },
      }),
      prisma.stream.findMany({
        where: { universityId: bulkUniversityId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
    ]);
    bulkConsultant = {
      universityName: university?.name ?? "University",
      universityCode: university?.code ?? "",
      streams,
    };
  }

  const canSeePartner = canSeeAdmissionLeadAssignedPartnerName(session.roles);

  const page = parsePage(String(query.page ?? 1));
  const pageSize = parsePageSize(String(query.pageSize ?? 25), 25, 100);
  const textWhere = leadTextSearchWhere(query.q);
  const where: Prisma.AdmissionLeadWhereInput = textWhere
    ? { AND: [{ batchId: batch.id }, textWhere] }
    : { batchId: batch.id };

  const [total, leadRows] = await Promise.all([
    prisma.admissionLead.count({ where }),
    prisma.admissionLead.findMany({
      where,
      orderBy: leadOrderBy(query.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        admissionState: true,
        pipelineStatus: true,
        createdAt: true,
        assignedPartnerDisplayName: true,
      },
    }),
  ]);

  const { page: safePage, totalPages } = paginationMeta(total, page, pageSize);

  const leads: BatchLeadListRow[] = leadRows.map((l) => ({
    id: l.id,
    firstName: l.firstName,
    lastName: l.lastName,
    email: l.email,
    mobile: l.mobile,
    admissionState: l.admissionState,
    pipelineStatus: l.pipelineStatus,
    createdAt: l.createdAt.toISOString(),
    assignedPartnerDisplayName: canSeePartner ? l.assignedPartnerDisplayName : null,
  }));

  return {
    kind: "ok" as const,
    batch: { id: batch.id, title: batch.title, code: batch.code },
    referralFormPath: `/ref/${token}`,
    bulkConsultant,
    leads,
    total,
    page: safePage,
    pageSize,
    totalPages,
    showAssignedPartnerColumn: canSeePartner,
  };
}
