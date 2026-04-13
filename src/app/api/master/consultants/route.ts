import { NextResponse } from "next/server";
import { z } from "zod";
import { sendAccountCredentialsEmail } from "@/lib/email";
import { requireMasterApi } from "@/lib/master-session";
import { generateRandomPassword, hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

const phoneSchema = z
  .string()
  .min(7)
  .max(32)
  .regex(/^[\d+][\d\s().-/]{5,30}$/);

const createSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  email: z.string().email().max(254).trim(),
  phone: phoneSchema,
  password: z.union([z.string().min(8).max(128), z.literal("")]).optional(),
  universityId: z.string().min(1).nullable().optional(),
});

export async function POST(req: Request) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const plainPassword =
    parsed.data.password && parsed.data.password.length > 0 ? parsed.data.password : generateRandomPassword();
  const passwordHash = await hashPassword(plainPassword);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
  }

  const universityId = parsed.data.universityId ?? null;
  if (universityId) {
    const uni = await prisma.university.findUnique({ where: { id: universityId } });
    if (!uni) {
      return NextResponse.json({ error: "University not found" }, { status: 400 });
    }
  }

  const consultantRole = await prisma.role.findUnique({ where: { slug: ROLES.consultant } });
  if (!consultantRole) {
    return NextResponse.json({ error: "Consultant role not configured" }, { status: 500 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      phone: parsed.data.phone,
      passwordHash,
      accountStatus: "ACTIVE",
      universityId,
      roles: {
        create: { roleId: consultantRole.id },
      },
    },
  });

  try {
    await sendAccountCredentialsEmail({
      to: email,
      name: parsed.data.name,
      email,
      password: plainPassword,
    });
  } catch (e) {
    console.error("sendAccountCredentialsEmail", e);
  }

  return NextResponse.json({ ok: true, userId: user.id });
}
