import type { Prisma } from "@prisma/client";

type Tx = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/** Alphanumeric segment derived from university code (APP-{seg}-######). */
export function applicationReferenceCodeSegment(universityCode: string): string {
  const seg = universityCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return seg.length > 0 ? seg.slice(0, 16) : "UNI";
}

/**
 * Next display reference for new applications: `APP-{UNICODE}-{6-digit seq}`.
 * Retries if another writer claims the same sequence first (unique constraint).
 */
export async function nextApplicationReferenceCode(
  tx: Tx,
  universityId: string,
  universityCode: string,
): Promise<string> {
  const seg = applicationReferenceCodeSegment(universityCode);
  const baseCount = await tx.application.count({ where: { universityId } });

  for (let bump = 0; bump < 32; bump++) {
    const candidate = `APP-${seg}-${String(baseCount + 1 + bump).padStart(6, "0")}`;
    const clash = await tx.application.findFirst({
      where: { referenceCode: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
  }

  return `APP-${seg}-${Date.now().toString(36).toUpperCase()}`;
}
