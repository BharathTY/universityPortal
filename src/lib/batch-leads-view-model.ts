import type { SessionPayload } from "@/lib/auth";
import { ensureBatchLeadPunchToken } from "@/lib/batch-lead-punch-token";
import { resolveConsultantActiveUniversityId } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { canSeeAdmissionLeadAssignedPartnerName, isConsultant, isMaster } from "@/lib/roles";

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

export async function loadBatchLeadsViewModel(batchId: string, session: SessionPayload) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true, title: true, code: true, ownerId: true },
  });
  if (!batch) return { kind: "not-found" as const };
  if (!isMaster(session.roles) && batch.ownerId !== session.sub) {
    return { kind: "forbidden" as const };
  }

  const token = await ensureBatchLeadPunchToken(batch.id);

  let bulkConsultant: BatchLeadsBulkConsultant | null = null;
  if (isConsultant(session.roles)) {
    const { universityId } = await resolveConsultantActiveUniversityId(session);
    if (universityId) {
      const [university, streams] = await Promise.all([
        prisma.university.findUnique({
          where: { id: universityId },
          select: { name: true, code: true },
        }),
        prisma.stream.findMany({
          where: { universityId },
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
  }

  const canSeePartner = canSeeAdmissionLeadAssignedPartnerName(session.roles);
  const leadsRaw = await prisma.admissionLead.findMany({
    where: { batchId: batch.id },
    orderBy: { createdAt: "desc" },
    take: 200,
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
  });

  const leads: BatchLeadListRow[] = leadsRaw.map((l) => ({
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
    showAssignedPartnerColumn: canSeePartner,
  };
}
