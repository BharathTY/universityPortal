import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { COOKIE_NAME, createSessionToken } from "@/lib/auth";
import { initialSessionUniversityIdForUser } from "@/lib/consultant-universities";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d+$/),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const code = parsed.data.code;

  const otp = await prisma.otpCode.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const ok = await verifyOtp(code, otp.codeHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await prisma.otpCode.deleteMany({ where: { email } });

  const defaultSlug = process.env.DEFAULT_ROLE_SLUG || "student";

  let user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });

  if (user?.inviteToken) {
    return NextResponse.json(
      {
        error:
          "Please accept your student invitation from email before signing in. Check your inbox for the acceptance link.",
      },
      { status: 403 },
    );
  }

  if (!user) {
    const role = await prisma.role.findUnique({ where: { slug: defaultSlug } });
    if (!role) {
      return NextResponse.json({ error: "Default role not configured" }, { status: 500 });
    }
    user = await prisma.user.create({
      data: {
        email,
        roles: {
          create: {
            roleId: role.id,
          },
        },
      },
      include: { roles: { include: { role: true } } },
    });
  } else if (user.roles.length === 0) {
    const role = await prisma.role.findUnique({ where: { slug: defaultSlug } });
    if (role) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
    }
    user = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { roles: { include: { role: true } } },
    });
  }

  const roles = user.roles.map((ur) => ur.role.slug);

  const universityId = await initialSessionUniversityIdForUser(user);

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    roles,
    universityId,
    studentOfId: user.studentOfId ?? null,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
