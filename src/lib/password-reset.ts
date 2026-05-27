import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_BYTES = 32;
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** SHA-256 hex digest for storing reset tokens (plain token never persisted). */
export function hashResetToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

export type CreateResetTokenResult = {
  token: string;
  expiresAt: Date;
};

/** Issue a single-use password reset token for the user (replaces prior unused tokens). */
export async function createResetToken(
  userId: string,
  expiryMs = DEFAULT_EXPIRY_MS,
): Promise<CreateResetTokenResult> {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + expiryMs);

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({
      where: { userId, usedAt: null },
    });
    await tx.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  });

  return { token, expiresAt };
}

export type VerifyResetTokenResult =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/** Validate a plain reset token without marking it used. */
export async function verifyResetToken(plain: string): Promise<VerifyResetTokenResult> {
  const tokenHash = hashResetToken(plain);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!row) {
    return { ok: false, reason: "invalid" };
  }
  if (row.usedAt) {
    return { ok: false, reason: "used" };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, userId: row.userId, tokenId: row.id };
}
