import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp } from "@/lib/otp";
import { shouldRevealOtpInApiResponse } from "@/lib/otp-display";
import { sendOtpEmail } from "@/lib/email";

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

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { inviteToken: true },
  });
  if (existing?.inviteToken) {
    return NextResponse.json(
      {
        error:
          "Please accept your student invitation from email first. After accepting, you can sign in with OTP.",
      },
      { status: 403 },
    );
  }

  const windowMs = 15 * 60 * 1000;
  if (!checkRateLimit(email, 5, windowMs)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  await prisma.otpCode.deleteMany({ where: { email } });

  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpCode.create({
    data: { email, codeHash, expiresAt },
  });

  await sendOtpEmail(email, code);

  const body: { ok: true; otp?: string } = { ok: true };
  if (shouldRevealOtpInApiResponse()) {
    body.otp = code;
  }
  return NextResponse.json(body);
}
