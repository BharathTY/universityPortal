import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Resolve academic year for a lead: prefer explicit id when valid; else first configured year. */
export async function resolveAcademicYearIdForLead(
  universityId: string,
  preferredId?: string | null,
): Promise<string | null> {
  return resolveAcademicYearIdWithPrisma(prisma, universityId, preferredId);
}

/** Same as {@link resolveAcademicYearIdForLead} but accepts a Prisma client (for tests). */
export async function resolveAcademicYearIdWithPrisma(
  db: Pick<PrismaClient, "academicYear">,
  universityId: string,
  preferredId?: string | null,
): Promise<string | null> {
  if (preferredId) {
    const y = await db.academicYear.findFirst({
      where: { id: preferredId, universityId },
      select: { id: true },
    });
    if (y) return y.id;
  }
  const first = await db.academicYear.findFirst({
    where: { universityId },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true },
  });
  return first?.id ?? null;
}
