import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, createSessionToken } from "@/lib/auth";
import { initialSessionUniversityIdForUser } from "@/lib/consultant-universities";

const schema = z.object({
  email: z.string().email(),
});

/**
 * Email-only login (no OTP). Creates the user if missing, assigns DEFAULT_ROLE_SLUG,
 * and sets the UP_SESSION cookie.
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

  const email = parsed.data.email.toLowerCase();

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
  } catch (e) {
    console.error("auth/login", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", detail: message },
      { status: 500 },
    );
  }
}

