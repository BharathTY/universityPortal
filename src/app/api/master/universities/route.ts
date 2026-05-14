import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendAccountCredentialsEmail } from "@/lib/email";
import { requireMasterApi } from "@/lib/master-session";
import { generateRandomPassword, hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { generateUniqueUniversityCode } from "@/lib/university-code";

const nameSchema = z.string().trim().min(1).max(200);

const createSchema = z.object({
  name: nameSchema,
  email: z.preprocess((v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === "string" && v.trim() === "") return undefined;
    return typeof v === "string" ? v.trim() : v;
  }, z.string().max(254).email().optional()),
  phone: z.preprocess((v) => {
    if (v === null || v === undefined || v === "") return undefined;
    return typeof v === "string" ? v.trim() : String(v);
  }, z.string().optional()),
  applicationFee: z.preprocess((v) => {
    if (v === null || v === undefined || v === "") return undefined;
    return v;
  }, z.coerce.number().optional()),
  logoUrl: z.string().max(2000).optional().nullable(),
});

function refinePhoneAndFee(data: z.infer<typeof createSchema>, ctx: z.RefinementCtx) {
  if (data.phone !== undefined && data.phone.length > 0) {
    if (!/^\d+$/.test(data.phone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only numeric values are allowed", path: ["phone"] });
    } else if (data.phone.length !== 10) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Phone number must be 10 digits", path: ["phone"] });
    }
  }
  if (data.applicationFee !== undefined && data.applicationFee !== null) {
    const n = data.applicationFee;
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid application fee", path: ["applicationFee"] });
    } else if (!Number.isInteger(n) || n <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid application fee", path: ["applicationFee"] });
    }
  }
}

const createBodySchema = createSchema.superRefine(refinePhoneAndFee);

function isValidLogoRef(s: string | null | undefined): boolean {
  if (s === undefined || s === null || s === "") return true;
  return /^https?:\/\//i.test(s) || s.startsWith("/uploads/");
}

export async function POST(req: Request) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(json);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return NextResponse.json(
      {
        error: "Invalid input",
        fieldErrors: flat.fieldErrors,
        formErrors: flat.formErrors,
      },
      { status: 400 },
    );
  }

  if (!isValidLogoRef(parsed.data.logoUrl ?? undefined)) {
    return NextResponse.json({ error: "Invalid logo URL" }, { status: 400 });
  }

  const email = parsed.data.email?.toLowerCase() ?? null;
  const phone = parsed.data.phone?.trim() || null;

  if (email) {
    const [emailUser, emailUni] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.university.findFirst({ where: { email } }),
    ]);
    if (emailUser || emailUni) {
      return NextResponse.json(
        {
          error: "Email already exists",
          fieldErrors: { email: ["Email already exists"] },
        },
        { status: 409 },
      );
    }
  }

  const universityRole = await prisma.role.findUnique({ where: { slug: ROLES.university } });
  if (email && !universityRole) {
    return NextResponse.json({ error: "University role not configured" }, { status: 500 });
  }

  const code = await generateUniqueUniversityCode(parsed.data.name);

  let credentialMail: { to: string; name: string; email: string; password: string } | null = null;

  const result = await prisma.$transaction(async (tx) => {
    const university = await tx.university.create({
      data: {
        name: parsed.data.name,
        code,
        email,
        phone,
        status: "ACTIVE",
        applicationFee:
          parsed.data.applicationFee !== undefined && parsed.data.applicationFee !== null
            ? new Prisma.Decimal(parsed.data.applicationFee)
            : null,
        logoUrl:
          parsed.data.logoUrl && parsed.data.logoUrl.trim().length > 0
            ? parsed.data.logoUrl.trim()
            : null,
      },
    });

    if (email && universityRole) {
      const plainPassword = generateRandomPassword();
      const passwordHash = await hashPassword(plainPassword);
      const user = await tx.user.create({
        data: {
          email,
          name: parsed.data.name,
          phone,
          passwordHash,
          accountStatus: "ACTIVE",
          universityId: university.id,
          roles: {
            create: { roleId: universityRole.id },
          },
        },
      });
      credentialMail = {
        to: email,
        name: parsed.data.name,
        email,
        password: plainPassword,
      };
      return { university, userId: user.id as string };
    }

    return { university, userId: null as string | null };
  });

  if (credentialMail) {
    try {
      await sendAccountCredentialsEmail(credentialMail);
    } catch (e) {
      console.error("sendAccountCredentialsEmail", e);
    }
  }

  return NextResponse.json({
    ok: true,
    universityId: result.university.id,
    userId: result.userId,
    code: result.university.code,
  });
}
