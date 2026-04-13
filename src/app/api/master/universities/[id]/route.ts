import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMasterApi } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

const phoneSchema = z
  .string()
  .min(7)
  .max(32)
  .regex(/^[\d+][\d\s().-/]{5,30}$/);

const patchSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  email: z.string().email().max(254).trim().optional(),
  phone: phoneSchema.optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteContext) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const university = await prisma.university.findUnique({ where: { id } });
  if (!university) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email =
    parsed.data.email !== undefined ? parsed.data.email.toLowerCase().trim() : undefined;
  if (email !== undefined && email !== university.email) {
    const [clashUser, clashUni] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.university.findFirst({ where: { email, NOT: { id } } }),
    ]);
    if (clashUni) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }
    if (clashUser) {
      const primary = await prisma.user.findFirst({
        where: {
          universityId: id,
          roles: { some: { role: { slug: ROLES.university } } },
        },
        orderBy: { createdAt: "asc" },
      });
      if (!primary || clashUser.id !== primary.id) {
        return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.university.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      },
    });

    if (email !== undefined || parsed.data.phone !== undefined || parsed.data.name !== undefined) {
      const uniUsers = await tx.user.findMany({
        where: {
          universityId: id,
          roles: { some: { role: { slug: ROLES.university } } },
        },
        orderBy: { createdAt: "asc" },
        take: 1,
      });
      const primary = uniUsers[0];
      if (primary) {
        await tx.user.update({
          where: { id: primary.id },
          data: {
            ...(email !== undefined ? { email } : {}),
            ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
            ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const university = await prisma.university.findUnique({ where: { id } });
  if (!university) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.university.update({
    where: { id },
    data: { status: "INACTIVE" },
  });

  return NextResponse.json({ ok: true });
}
