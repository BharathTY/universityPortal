import { prisma } from "@/lib/prisma";

export type CatalogOption = { value: string; label: string };

export async function listDegreeTypes(): Promise<CatalogOption[]> {
  try {
    const rows = await prisma.catalogDegreeType.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: { code: true, label: true },
    });
    return rows.map((r) => ({ value: r.code, label: r.label }));
  } catch {
    return [];
  }
}

export async function degreeTypeLabel(value: string | null | undefined): Promise<string> {
  if (!value) return "";
  try {
    const row = await prisma.catalogDegreeType.findFirst({
      where: { OR: [{ code: value }, { externalId: value }] },
      select: { label: true },
    });
    if (row) return row.label;
  } catch {
    /* ignore */
  }
  return value;
}
