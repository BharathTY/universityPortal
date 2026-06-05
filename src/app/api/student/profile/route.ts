import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";
import { isoToDateInputValue } from "@/lib/student-portal";

const patchSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  phone: z.string().min(5).max(32).optional(),
  whatsappNumber: z.string().max(32).optional().nullable(),
  gender: z.string().max(32).optional().nullable(),
  dateOfBirth: z.string().max(32).optional().nullable(),
  stateStudent: z.string().max(120).optional().nullable(),
  districtStudent: z.string().max(120).optional().nullable(),
  pincode: z.string().max(12).optional().nullable(),
  pucType: z.string().max(32).optional().nullable(),
  pucInstitution: z.string().max(200).optional().nullable(),
  pucYear: z.union([z.number().int(), z.string()]).optional().nullable(),
  pucPercent: z.union([z.number(), z.string()]).optional().nullable(),
  ieltsScore: z.string().max(32).optional().nullable(),
  toeflScore: z.string().max(32).optional().nullable(),
  passportNumber: z.string().max(64).optional().nullable(),
  passportExpiry: z.string().max(32).optional().nullable(),
});

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value == null || value.trim() === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseOptionalDecimal(value: number | string | null | undefined): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return new Prisma.Decimal(n);
}

function parseOptionalInt(value: number | string | null | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

export async function GET() {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      name: true,
      email: true,
      phone: true,
      whatsappNumber: true,
      gender: true,
      dateOfBirth: true,
      stateStudent: true,
      districtStudent: true,
      pincode: true,
      pucType: true,
      pucInstitution: true,
      pucYear: true,
      pucPercent: true,
      ieltsScore: true,
      toeflScore: true,
      passportNumber: true,
      passportExpiry: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      fullName: user.name ?? "",
      email: user.email,
      mobile: user.phone ?? "",
      whatsapp: user.whatsappNumber ?? "",
      gender: user.gender ?? "",
      dateOfBirth: isoToDateInputValue(user.dateOfBirth),
      state: user.stateStudent ?? "",
      district: user.districtStudent ?? "",
      pincode: user.pincode ?? "",
      pucType: user.pucType ?? "",
      pucInstitution: user.pucInstitution ?? "",
      pucYear: user.pucYear,
      pucPercent: user.pucPercent?.toString() ?? "",
      ieltsScore: user.ieltsScore ?? "",
      toeflScore: user.toeflScore ?? "",
      passportNumber: user.passportNumber ?? "",
      passportExpiry: isoToDateInputValue(user.passportExpiry),
    },
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  await prisma.user.update({
    where: { id: session.sub },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.whatsappNumber !== undefined
        ? { whatsappNumber: parsed.data.whatsappNumber?.trim() || null }
        : {}),
      ...(parsed.data.gender !== undefined ? { gender: parsed.data.gender?.trim() || null } : {}),
      ...(parseOptionalDate(parsed.data.dateOfBirth) !== undefined
        ? { dateOfBirth: parseOptionalDate(parsed.data.dateOfBirth) }
        : {}),
      ...(parsed.data.stateStudent !== undefined
        ? { stateStudent: parsed.data.stateStudent?.trim() || null }
        : {}),
      ...(parsed.data.districtStudent !== undefined
        ? { districtStudent: parsed.data.districtStudent?.trim() || null }
        : {}),
      ...(parsed.data.pincode !== undefined ? { pincode: parsed.data.pincode?.trim() || null } : {}),
      ...(parsed.data.pucType !== undefined ? { pucType: parsed.data.pucType?.trim() || null } : {}),
      ...(parsed.data.pucInstitution !== undefined
        ? { pucInstitution: parsed.data.pucInstitution?.trim() || null }
        : {}),
      ...(parseOptionalInt(parsed.data.pucYear) !== undefined
        ? { pucYear: parseOptionalInt(parsed.data.pucYear) }
        : {}),
      ...(parseOptionalDecimal(parsed.data.pucPercent) !== undefined
        ? { pucPercent: parseOptionalDecimal(parsed.data.pucPercent) }
        : {}),
      ...(parsed.data.ieltsScore !== undefined ? { ieltsScore: parsed.data.ieltsScore?.trim() || null } : {}),
      ...(parsed.data.toeflScore !== undefined ? { toeflScore: parsed.data.toeflScore?.trim() || null } : {}),
      ...(parsed.data.passportNumber !== undefined
        ? { passportNumber: parsed.data.passportNumber?.trim() || null }
        : {}),
      ...(parseOptionalDate(parsed.data.passportExpiry) !== undefined
        ? { passportExpiry: parseOptionalDate(parsed.data.passportExpiry) }
        : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
