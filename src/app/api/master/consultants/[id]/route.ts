import { NextResponse } from "next/server";
import { z } from "zod";
import { replaceConsultantUniversityAssignments } from "@/lib/consultant-universities";
import { requireMasterApi } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";

const consultantPhoneSchema = z
  .string()
  .transform((raw) => raw.trim())
  .superRefine((s, ctx) => {
    if (s.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Phone number is required" });
      return;
    }
    if (!/^\d+$/.test(s)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only numbers are allowed" });
      return;
    }
    if (s.length !== 10) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Phone number must be 10 digits" });
    }
  });

const patchSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  email: z.string().email().max(254).trim().optional(),
  phone: consultantPhoneSchema.optional(),
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

  const email = parsed.data.email?.toLowerCase().trim();
  if (email && email !== user.email) {
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash) {
      return NextResponse.json(
        { error: "Email already exists", fieldErrors: { email: ["Email already exists"] } },
        { status: 409 },
      );
    }
  }

  if (parsed.data.universityIds !== undefined) {
    const ids = [...new Set(parsed.data.universityIds)];
    if (ids.length === 0) {
      return NextResponse.json({ error: "Please select at least one university" }, { status: 400 });
    }
    const count = await prisma.university.count({
      where: { id: { in: ids }, status: "ACTIVE" },
    });
    if (count !== ids.length) {
      return NextResponse.json(
        { error: "One or more universities are invalid or inactive" },
        { status: 400 },
      );
    }
    await replaceConsultantUniversityAssignments(id, ids);
  }

  await prisma.user.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(email !== undefined ? { email: email } : {}),
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
