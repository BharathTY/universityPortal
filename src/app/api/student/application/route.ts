import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";
import { isRazorpayConfigured } from "@/lib/razorpay-server";

const patchSchema = z.object({
  firstName: z.string().min(1).max(120).optional(),
  lastName: z.string().min(1).max(120).optional(),
  phone: z.string().min(5).max(32).optional(),
  nationality: z.string().max(120).optional().nullable(),
  admissionState: z.string().min(1).max(120).optional(),
  specialization: z.string().max(200).optional().nullable(),
  referralFirstName: z.string().max(120).optional().nullable(),
  referralLastName: z.string().max(120).optional().nullable(),
  referralPhone: z.string().max(32).optional().nullable(),
  referralEmail: z.union([z.string().email().max(254), z.literal("")]).optional().nullable(),
  /** ISO-like string from `<input type="datetime-local" />` */
  admissionVisitAt: z.string().max(64).optional().nullable(),
  campusTourAt: z.string().max(64).optional().nullable(),
});

function parseVisitAt(value: string | null | undefined): Date | null {
  if (value == null || value.trim() === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET() {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.application.findFirst({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    include: {
      university: { select: { name: true, code: true } },
      user: { select: { name: true, phone: true, email: true } },
      lead: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          stream: { select: { name: true } },
          academicYear: { select: { label: true } },
          nationality: true,
          specialization: true,
          admissionState: true,
          referralFirstName: true,
          referralLastName: true,
          referralPhone: true,
          referralEmail: true,
        },
      },
    },
  });

  const razorpayConfigured = isRazorpayConfigured();

  if (!row) {
    return NextResponse.json({ application: null, razorpayConfigured });
  }

  return NextResponse.json({
    application: {
      id: row.id,
      status: row.status,
      paymentStatus: row.paymentStatus,
      admissionReview: row.admissionReview,
      admissionVisitAt: row.admissionVisitAt?.toISOString() ?? null,
      campusTourAt: row.campusTourAt?.toISOString() ?? null,
      university: row.university,
      user: row.user,
      lead: row.lead,
      razorpayConfigured,
    },
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
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
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

  await prisma.user.update({
    where: { id: session.sub },
    data: {
      ...(name ? { name } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
    },
  });

  const leadUpdate: Record<string, unknown> = {};
  if (parsed.data.nationality !== undefined) leadUpdate.nationality = parsed.data.nationality;
  if (parsed.data.admissionState !== undefined) leadUpdate.admissionState = parsed.data.admissionState.trim();
  if (parsed.data.specialization !== undefined) {
    const s = parsed.data.specialization?.trim();
    leadUpdate.specialization = s && s.length > 0 ? s : null;
  }
  if (parsed.data.referralFirstName !== undefined) {
    leadUpdate.referralFirstName = parsed.data.referralFirstName?.trim() || null;
  }
  if (parsed.data.referralLastName !== undefined) {
    leadUpdate.referralLastName = parsed.data.referralLastName?.trim() || null;
  }
  if (parsed.data.referralPhone !== undefined) {
    leadUpdate.referralPhone = parsed.data.referralPhone?.trim() || null;
  }
  if (parsed.data.referralEmail !== undefined) {
    const e = parsed.data.referralEmail?.trim();
    leadUpdate.referralEmail = e && e.length > 0 ? e.toLowerCase() : null;
  }
  if (first !== undefined) leadUpdate.firstName = first.trim();
  if (last !== undefined) leadUpdate.lastName = last.trim();

  if (application.leadId && Object.keys(leadUpdate).length > 0) {
    await prisma.admissionLead.update({
      where: { id: application.leadId },
      data: leadUpdate as Prisma.AdmissionLeadUpdateInput,
    });
  }

  const appUpdate: { admissionVisitAt?: Date | null; campusTourAt?: Date | null } = {};
  if (parsed.data.admissionVisitAt !== undefined) {
    const d = parseVisitAt(parsed.data.admissionVisitAt);
    if (parsed.data.admissionVisitAt && parsed.data.admissionVisitAt.trim() !== "" && d === null) {
      return NextResponse.json({ error: "Invalid admission visit date" }, { status: 400 });
    }
    appUpdate.admissionVisitAt = d;
  }
  if (parsed.data.campusTourAt !== undefined) {
    const d = parseVisitAt(parsed.data.campusTourAt);
    if (parsed.data.campusTourAt && parsed.data.campusTourAt.trim() !== "" && d === null) {
      return NextResponse.json({ error: "Invalid campus tour date" }, { status: 400 });
    }
    appUpdate.campusTourAt = d;
  }
  if (Object.keys(appUpdate).length > 0) {
    await prisma.application.update({
      where: { id: application.id },
      data: appUpdate,
    });
  }

  return NextResponse.json({ ok: true });
}
