import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/password";
import { verifyOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request. Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;
  const now = new Date();

  try {
    const candidates = await prisma.passwordResetToken.findMany({
      where: { usedAt: null, expiresAt: { gt: now } },
      select: { id: true, userId: true, tokenHash: true },
    });

    let matched: (typeof candidates)[number] | null = null;
    for (const row of candidates) {
      const ok = await verifyOtp(token, row.tokenHash);
      if (ok) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: matched.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: matched.id },
        data: { usedAt: now },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("reset-password", e);
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      { error: isDev && e instanceof Error ? e.message : "Could not reset password. Try again." },
      { status: 500 },
    );
  }
}
