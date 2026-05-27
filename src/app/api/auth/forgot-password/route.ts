import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPasswordResetEmail } from "@/lib/email";
import { hashOtp } from "@/lib/otp";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email(),
});

const rateBucket = new Map<string, number[]>();

function checkRateLimit(email: string, maxPerWindow: number, windowMs: number): boolean {
  const now = Date.now();
  const times = rateBucket.get(email) ?? [];
  const recent = times.filter((t) => now - t < windowMs);
  if (recent.length >= maxPerWindow) return false;
  recent.push(now);
  rateBucket.set(email, recent);
  return true;
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  const windowMs = 15 * 60 * 1000;
  if (!checkRateLimit(email, 5, windowMs)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, passwordHash: true },
    });

    if (user?.passwordHash) {
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      const token = randomBytes(32).toString("hex");
      const tokenHash = await hashOtp(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const resetUrl = `${getPublicAppOrigin()}/reset-password?token=${encodeURIComponent(token)}`;

      try {
        await sendPasswordResetEmail({
          to: email,
          name: user.name ?? email,
          resetUrl,
        });
      } catch (e) {
        console.error("sendPasswordResetEmail failed", e);
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`[Password reset dev] To: ${email}\nReset link: ${resetUrl}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "If an account with that email exists, we sent password reset instructions.",
    });
  } catch (e) {
    console.error("forgot-password", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: isDev
          ? `Could not process request: ${message}` +
            (message.includes("P1001") ? " (check DATABASE_URL / Postgres)" : "")
          : "Could not process request. Try again later.",
      },
      { status: 500 },
    );
  }
}
