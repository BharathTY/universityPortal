import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getStudentApplication, listStudentApplications } from "@/lib/student-application-data";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";
import { isRazorpayConfigured } from "@/lib/razorpay-server";

const patchSchema = z.object({
  applicationId: z.string().min(1).optional(),
  firstName: z.string().min(1).max(120).optional(),
  lastName: z.string().min(1).max(120).optional(),
  phone: z.string().min(5).max(32).optional(),
  phoneAlternate: z.union([z.string().max(32), z.literal("")]).optional().nullable(),
  whatsappNumber: z.string().max(32).optional().nullable(),
  address: z.string().max(1000).optional().nullable(),
  pincode: z.string().max(12).optional().nullable(),
  district: z.string().max(120).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  nationality: z.string().max(120).optional().nullable(),
  admissionState: z.string().max(120).optional().nullable(),
  specialization: z.string().max(200).optional().nullable(),
  gender: z.string().max(32).optional().nullable(),
  dateOfBirth: z.string().max(32).optional().nullable(),
  sslcSchool: z.string().max(200).optional().nullable(),
  sslcBoard: z.string().max(120).optional().nullable(),
  sslcPercent: z.union([z.number(), z.string()]).optional().nullable(),
  pucType: z.string().max(32).optional().nullable(),
  pucInstitution: z.string().max(200).optional().nullable(),
  pucYear: z.union([z.number().int(), z.string()]).optional().nullable(),
  pucPercent: z.union([z.number(), z.string()]).optional().nullable(),
  degreeName: z.string().max(200).optional().nullable(),
  degreeStream: z.string().max(200).optional().nullable(),
  degreeCollege: z.string().max(200).optional().nullable(),
  degreeUniversity: z.string().max(200).optional().nullable(),
  degreePercent: z.union([z.number(), z.string()]).optional().nullable(),
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

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const applicationId = url.searchParams.get("applicationId");

  const [applications, application] = await Promise.all([
    listStudentApplications(session.sub),
    getStudentApplication(session.sub, applicationId),
  ]);

  const razorpayConfigured = isRazorpayConfigured();

  return NextResponse.json({
    applications: applications.map((a) => ({
      id: a.id,
      referenceCode: a.referenceCode,
      universityName: a.university?.name ?? "University",
      universityCode: a.university?.code ?? "",
      programmeName: a.lead?.stream.name ?? "Programme",
    })),
    application,
    razorpayConfigured,
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

  const application = await prisma.application.findFirst({
    where: {
      userId: session.sub,
      ...(parsed.data.applicationId ? { id: parsed.data.applicationId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, leadId: true },
  });
  if (!application) {
    return NextResponse.json({ error: "No application" }, { status: 404 });
  }

  const first = parsed.data.firstName;
  const last = parsed.data.lastName;
  const name =
    first || last
      ? [first ?? "", last ?? ""].map((s) => s.trim()).filter(Boolean).join(" ")
      : undefined;

  const userUpdate: Prisma.UserUpdateInput = {
    ...(name ? { name } : {}),
    ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
    ...(parsed.data.phoneAlternate !== undefined
      ? { phoneAlternate: parsed.data.phoneAlternate?.trim() || null }
      : {}),
    ...(parsed.data.whatsappNumber !== undefined
      ? { whatsappNumber: parsed.data.whatsappNumber?.trim() || null }
      : {}),
    ...(parsed.data.pincode !== undefined ? { pincode: parsed.data.pincode?.trim() || null } : {}),
    ...(parsed.data.district !== undefined
      ? { districtStudent: parsed.data.district?.trim() || null }
      : {}),
    ...(parsed.data.state !== undefined ? { stateStudent: parsed.data.state?.trim() || null } : {}),
    ...(parsed.data.gender !== undefined ? { gender: parsed.data.gender?.trim() || null } : {}),
    ...(parseOptionalDate(parsed.data.dateOfBirth) !== undefined
      ? { dateOfBirth: parseOptionalDate(parsed.data.dateOfBirth) }
      : {}),
    ...(parsed.data.sslcSchool !== undefined ? { sslcSchool: parsed.data.sslcSchool?.trim() || null } : {}),
    ...(parsed.data.sslcBoard !== undefined ? { sslcBoard: parsed.data.sslcBoard?.trim() || null } : {}),
    ...(parseOptionalDecimal(parsed.data.sslcPercent) !== undefined
      ? { sslcPercent: parseOptionalDecimal(parsed.data.sslcPercent) }
      : {}),
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
    ...(parsed.data.degreeName !== undefined ? { degreeName: parsed.data.degreeName?.trim() || null } : {}),
    ...(parsed.data.degreeStream !== undefined
      ? { degreeStream: parsed.data.degreeStream?.trim() || null }
      : {}),
    ...(parsed.data.degreeCollege !== undefined
      ? { degreeCollege: parsed.data.degreeCollege?.trim() || null }
      : {}),
    ...(parsed.data.degreeUniversity !== undefined
      ? { degreeUniversity: parsed.data.degreeUniversity?.trim() || null }
      : {}),
    ...(parseOptionalDecimal(parsed.data.degreePercent) !== undefined
      ? { degreePercent: parseOptionalDecimal(parsed.data.degreePercent) }
      : {}),
    ...(parsed.data.ieltsScore !== undefined ? { ieltsScore: parsed.data.ieltsScore?.trim() || null } : {}),
    ...(parsed.data.toeflScore !== undefined ? { toeflScore: parsed.data.toeflScore?.trim() || null } : {}),
    ...(parsed.data.passportNumber !== undefined
      ? { passportNumber: parsed.data.passportNumber?.trim() || null }
      : {}),
    ...(parseOptionalDate(parsed.data.passportExpiry) !== undefined
      ? { passportExpiry: parseOptionalDate(parsed.data.passportExpiry) }
      : {}),
  };

  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({
      where: { id: session.sub },
      data: userUpdate,
    });
  }

  const leadUpdate: Prisma.AdmissionLeadUpdateInput = {};
  if (parsed.data.nationality !== undefined) leadUpdate.nationality = parsed.data.nationality;
  if (parsed.data.admissionState !== undefined) {
    leadUpdate.admissionState = parsed.data.admissionState?.trim() || null;
  }
  if (parsed.data.specialization !== undefined) {
    const s = parsed.data.specialization?.trim();
    leadUpdate.specialization = s && s.length > 0 ? s : null;
  }
  if (parsed.data.address !== undefined) leadUpdate.address = parsed.data.address?.trim() || null;
  if (parsed.data.district !== undefined) leadUpdate.district = parsed.data.district?.trim() || null;
  if (parsed.data.state !== undefined) leadUpdate.state = parsed.data.state?.trim() || null;
  if (parsed.data.pincode !== undefined) leadUpdate.pincode = parsed.data.pincode?.trim() || null;
  if (first !== undefined) leadUpdate.firstName = first.trim();
  if (last !== undefined) leadUpdate.lastName = last.trim();
  if (parsed.data.sslcBoard !== undefined) leadUpdate.sslcBoard = parsed.data.sslcBoard?.trim() || null;
  if (parseOptionalDecimal(parsed.data.sslcPercent) !== undefined) {
    leadUpdate.sslcPercent = parseOptionalDecimal(parsed.data.sslcPercent);
  }
  if (parsed.data.pucInstitution !== undefined) {
    leadUpdate.pucBoard = parsed.data.pucInstitution?.trim() || null;
  }
  if (parseOptionalInt(parsed.data.pucYear) !== undefined) {
    leadUpdate.pucYear = parseOptionalInt(parsed.data.pucYear);
  }
  if (parseOptionalDecimal(parsed.data.pucPercent) !== undefined) {
    leadUpdate.pucPercent = parseOptionalDecimal(parsed.data.pucPercent);
  }
  if (parsed.data.degreeName !== undefined) leadUpdate.degreeName = parsed.data.degreeName?.trim() || null;
  if (parsed.data.degreeStream !== undefined) {
    leadUpdate.degreeStream = parsed.data.degreeStream?.trim() || null;
  }
  if (parsed.data.degreeCollege !== undefined) {
    leadUpdate.degreeCollege = parsed.data.degreeCollege?.trim() || null;
  }
  if (parsed.data.degreeUniversity !== undefined) {
    leadUpdate.degreeUniversity = parsed.data.degreeUniversity?.trim() || null;
  }
  if (parseOptionalDecimal(parsed.data.degreePercent) !== undefined) {
    leadUpdate.degreePercent = parseOptionalDecimal(parsed.data.degreePercent);
  }

  if (application.leadId && Object.keys(leadUpdate).length > 0) {
    await prisma.admissionLead.update({
      where: { id: application.leadId },
      data: leadUpdate,
    });
  }

  return NextResponse.json({ ok: true });
}
