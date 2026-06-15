import { prisma } from "@/lib/prisma";

export type CatalogStreamOption = {
  value: string;
  label: string;
  degreeTypeExternalId: string | null;
  universityExternalId: string | null;
};

export async function listStreamSpecializations(filters?: {
  universityExternalId?: string;
  degreeTypeExternalId?: string;
}): Promise<CatalogStreamOption[]> {
  try {
    const rows = await prisma.catalogStreamSpecialization.findMany({
      where: {
        active: true,
        ...(filters?.universityExternalId
          ? { OR: [{ universityExternalId: filters.universityExternalId }, { universityExternalId: null }] }
          : {}),
        ...(filters?.degreeTypeExternalId
          ? { degreeTypeExternalId: filters.degreeTypeExternalId }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        externalId: true,
        code: true,
        name: true,
        degreeTypeExternalId: true,
        universityExternalId: true,
      },
    });
    return rows.map((r) => ({
      value: r.code ?? r.externalId,
      label: r.name,
      degreeTypeExternalId: r.degreeTypeExternalId,
      universityExternalId: r.universityExternalId,
    }));
  } catch {
    return [];
  }
}
