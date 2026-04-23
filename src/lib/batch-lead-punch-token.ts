import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Ensures the batch has a stable public token for brochure QR links (`/ref/[token]`). */
export async function ensureBatchLeadPunchToken(batchId: string): Promise<string> {
  const existing = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { leadPunchToken: true },
  });
  if (!existing) {
    throw new Error("Batch not found");
  }
  if (existing.leadPunchToken) {
    return existing.leadPunchToken;
  }
  for (let i = 0; i < 5; i += 1) {
    const token = randomBytes(20).toString("base64url");
    try {
      const updated = await prisma.batch.update({
        where: { id: batchId },
        data: { leadPunchToken: token },
        select: { leadPunchToken: true },
      });
      return updated.leadPunchToken!;
    } catch {
      // rare unique collision — retry
    }
  }
  throw new Error("Could not allocate lead punch token");
}
