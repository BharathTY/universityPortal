import { NextResponse } from "next/server";
import { z } from "zod";
import { replaceConsultantUniversityAssignments } from "@/lib/consultant-universities";
import { requireMasterApi } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";

const phoneSchema = z
  .string()
  .min(7)
  .max(32)
  .regex(/^[\d+][\d\s().-/]{5,30}$/);

const patchSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  email: z.string().email().max(254).trim().optional(),
  phone: phoneSchema.optional(),
  universityIds: z.array(z.string().min(1)).optional(),
  accountStatus: z.enum(["ACTIVE", "INACTIVE"]).optional(),
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

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = parsed.data.email?.toLowerCase();
  if (email && email !== user.email) {
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }
  }

  if (parsed.data.universityIds !== undefined) {
    const ids = [...new Set(parsed.data.universityIds)];
    if (ids.length > 0) {
      const count = await prisma.university.count({ where: { id: { in: ids } } });
      if (count !== ids.length) {
        return NextResponse.json({ error: "One or more universities not found" }, { status: 400 });
      }
    }
    await replaceConsultantUniversityAssignments(id, ids);
  }

  await prisma.user.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.accountStatus !== undefined ? { accountStatus: parsed.data.accountStatus } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { accountStatus: "INACTIVE" },
  });

  return NextResponse.json({ ok: true });
}
