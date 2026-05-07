import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendAccountCredentialsEmail } from "@/lib/email";
import { requireMasterApi } from "@/lib/master-session";
import { generateRandomPassword, hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { generateUniqueUniversityCode } from "@/lib/university-code";

const phoneSchema = z
  .string()
  .min(7)
  .max(32)
  .regex(/^[\d+][\d\s().-/]{5,30}$/);

const createSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  email: z.string().email().max(254).trim(),
  phone: phoneSchema,
  applicationFee: z.coerce.number().nonnegative().max(999_999_999),
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
  const plainPassword = generateRandomPassword();
  const passwordHash = await hashPassword(plainPassword);

  const [emailUser, emailUni] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.university.findFirst({ where: { email } }),
  ]);
  if (emailUser || emailUni) {
    return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
  }

  const universityRole = await prisma.role.findUnique({ where: { slug: ROLES.university } });
  if (!universityRole) {
    return NextResponse.json({ error: "University role not configured" }, { status: 500 });
  }

  const code = await generateUniqueUniversityCode(parsed.data.name);

  const result = await prisma.$transaction(async (tx) => {
    const university = await tx.university.create({
      data: {
        name: parsed.data.name,
        code,
        email,
        phone: parsed.data.phone,
        status: "ACTIVE",
        applicationFee: new Prisma.Decimal(parsed.data.applicationFee.toFixed(2)),
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        name: parsed.data.name,
        phone: parsed.data.phone,
        passwordHash,
        accountStatus: "ACTIVE",
        universityId: university.id,
        roles: {
          create: { roleId: universityRole.id },
        },
      },
    });

    return { university, user };
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

  return NextResponse.json({
    ok: true,
    universityId: result.university.id,
    userId: result.user.id,
    code: result.university.code,
  });
}
