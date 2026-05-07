import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp } from "@/lib/otp";
import { shouldRevealOtpInApiResponse } from "@/lib/otp-display";
import { sendOtpEmail } from "@/lib/email";

const bodySchema = z.object({
  email: z.string().email(),
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
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  try {
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

    await prisma.otpCode.deleteMany({ where: { email } });

    const code = generateOtp();
    const codeHash = await hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpCode.create({
      data: { email, codeHash, expiresAt },
    });

    try {
      await sendOtpEmail(email, code);
    } catch (e) {
      console.error("sendOtpEmail failed (OTP still stored; user can verify if code is shown in dev)", e);
    }

    const body: { ok: true; otp?: string } = { ok: true };
    if (shouldRevealOtpInApiResponse()) {
      body.otp = code;
    }
    return NextResponse.json(body);
  } catch (e) {
    console.error("request-otp", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: isDev
          ? `Could not send code: ${message}` + (message.includes("P1001") ? " (check DATABASE_URL / Postgres)" : "")
          : "Could not send verification code. Try again later.",
      },
      { status: 500 },
    );
  }
}
