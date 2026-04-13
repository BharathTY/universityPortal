import { prisma } from "@/lib/prisma";

function slugPart(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "UNI";
}

/** Unique university code for `University.code` (e.g. ACME-A1B2). */
export async function generateUniqueUniversityCode(name: string): Promise<string> {
  const base = slugPart(name);
  for (let i = 0; i < 20; i++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `${base}-${suffix}`;
    const existing = await prisma.university.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return `${base}-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}
