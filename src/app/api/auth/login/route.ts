import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, buildSessionCookieOptions, createSessionToken, defaultSessionMaxAgeSec } from "@/lib/auth";
import { initialSessionUniversityIdForUser } from "@/lib/consultant-universities";
import { verifyPassword } from "@/lib/password";
import { defaultDashboardPath } from "@/lib/roles";

const schema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
});

/**
 * Sign-in: email + optional password when the account has a password set.
 * Open sign-up (new student) is email-only if no password is sent.
 * Disabled when REQUIRE_OTP_LOGIN=true (use OTP flow instead).
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (process.env.REQUIRE_OTP_LOGIN === "true") {
    return NextResponse.json(
      { error: "This deployment uses email verification codes. Use Continue on the login page to receive a code." },
      { status: 403 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password?.trim() ?? "";

  try {
    const defaultSlug = process.env.DEFAULT_ROLE_SLUG || "student";

    let user = await prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (user?.inviteToken) {
      return NextResponse.json(
        {
          error:
            "Please activate your account using the link sent to your email before signing in.",
        },
        { status: 403 },
      );
    }

    if (user?.accountStatus === "INACTIVE") {
      return NextResponse.json(
        { error: "This account is inactive. Contact your administrator." },
        { status: 403 },
      );
    }

    if (user?.passwordHash) {
      if (!password) {
        return NextResponse.json({ error: "Password required" }, { status: 401 });
      }
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
    } else if (password.length > 0) {
      return NextResponse.json(
        { error: "This account signs in without a password. Leave the password field empty." },
        { status: 400 },
      );
    }

    if (!user) {
      if (password.length > 0) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
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
    cookieStore.set(COOKIE_NAME, token, buildSessionCookieOptions(defaultSessionMaxAgeSec));

    return NextResponse.json({ ok: true, redirectTo: defaultDashboardPath(roles) });
  } catch (e) {
    console.error("auth/login", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", detail: message },
      { status: 500 },
    );
  }
}

