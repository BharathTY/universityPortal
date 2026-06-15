import { prisma } from "@/lib/prisma";
import { QUALIFICATION_TYPES as FALLBACK_QUALIFICATION_TYPES } from "@/lib/qualification-types.constants";

export type CatalogOption = { value: string; label: string };

/** Active qualification types — DB catalog first, then built-in fallback. */
export async function listQualificationTypes(): Promise<CatalogOption[]> {
  try {
    const rows = await prisma.catalogQualificationType.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: { code: true, label: true },
    });
    if (rows.length > 0) {
      return rows.map((r) => ({ value: r.code, label: r.label }));
    }
  } catch {
    /* table may not exist during migration */
  }
  return [...FALLBACK_QUALIFICATION_TYPES];
}

export async function qualificationLabelFromCatalog(value: string | null | undefined): Promise<string> {
  if (!value) return "";
  try {
    const row = await prisma.catalogQualificationType.findFirst({
      where: { OR: [{ code: value }, { externalId: value }] },
      select: { label: true },
    });
    if (row) return row.label;
  } catch {
    /* ignore */
  }
  const found = FALLBACK_QUALIFICATION_TYPES.find((q) => q.value === value);
  return found?.label ?? value;
}
