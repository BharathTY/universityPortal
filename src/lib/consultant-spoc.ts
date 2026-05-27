import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

export const CONSULTANT_SPOC_ROLE_SLUGS = [ROLES.consultantSpoc, ROLES.counsellor] as const;

export type ConsultantSpocDraft = {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  designation: string;
  password: string;
};

export type ConsultantSpocSummary = {
  id: string;
  name: string | null;
  email: string;
  designation: string | null;
  accountStatus: string;
};

export function createEmptyConsultantSpocDraft(): ConsultantSpocDraft {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `spoc-${Date.now()}-${Math.random()}`,
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    designation: "",
    password: "",
  };
}

export function isConsultantSpocRowFilled(row: ConsultantSpocDraft): boolean {
  return Boolean(row.name.trim() || row.email.trim() || row.phone.trim());
}

export function filledConsultantSpocRows(rows: ConsultantSpocDraft[]): ConsultantSpocDraft[] {
  return rows.filter(isConsultantSpocRowFilled);
}

export async function loadConsultantSpocsGrouped(
  consultantIds: string[],
  db: Pick<PrismaClient, "user"> = prisma,
): Promise<Map<string, ConsultantSpocSummary[]>> {
  const map = new Map<string, ConsultantSpocSummary[]>();
  if (consultantIds.length === 0) return map;

  const rows = await db.user.findMany({
    where: {
      reportsToConsultantId: { in: consultantIds },
      roles: { some: { role: { slug: { in: [...CONSULTANT_SPOC_ROLE_SLUGS] } } } },
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      designation: true,
      accountStatus: true,
      reportsToConsultantId: true,
    },
  });

  for (const row of rows) {
    const key = row.reportsToConsultantId;
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      email: row.email,
      designation: row.designation,
      accountStatus: row.accountStatus,
    });
    map.set(key, list);
  }

  return map;
}
