import { NextResponse } from "next/server";
import { AdmissionLeadStatus, LeadPipelineStatus } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isAdmissionLeadRoleSlug } from "@/lib/admission-lead-role";
import { prisma } from "@/lib/prisma";
import { canAccessUniversityScope } from "@/lib/university-scope";

const createSchema = z.object({
  academicYearId: z.string().min(1),
  streamId: z.string().min(1),
  firstName: z.string().min(1).max(120).trim(),
  lastName: z.string().min(1).max(120).trim(),
  email: z.string().email().max(254).trim(),
  mobile: z.string().min(5).max(32).trim(),
  consultantCode: z.string().min(1).max(64).trim(),
  /** `Role.id` — must be a role whose slug is allowed for leads (e.g. consultant, counsellor). */
  consultantRoleId: z.string().min(1),
  admissionStatus: z.nativeEnum(AdmissionLeadStatus).optional(),
  nationality: z.string().max(120).trim().optional().nullable(),
  specialization: z.string().min(1).max(200).trim(),
});

type RouteContext = { params: Promise<{ universityId: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { universityId } = await ctx.params;
  if (!canAccessUniversityScope(session, universityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const academicYearId = url.searchParams.get("academicYearId") ?? undefined;
  const streamId = url.searchParams.get("streamId") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get("pageSize") ?? "10") || 10));

  const where = {
    universityId,
    ...(academicYearId ? { academicYearId } : {}),
    ...(streamId ? { streamId } : {}),
  };

  const [total, leads] = await Promise.all([
    prisma.admissionLead.count({ where }),
    prisma.admissionLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        academicYear: { select: { label: true } },
        stream: { select: { name: true } },
        consultantRole: { select: { id: true, slug: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    leads,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { universityId } = await ctx.params;
  if (!canAccessUniversityScope(session, universityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const [year, stream] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { id: parsed.data.academicYearId, universityId },
    }),
    prisma.stream.findFirst({
      where: { id: parsed.data.streamId, universityId },
    }),
  ]);

  if (!year || !stream) {
    return NextResponse.json({ error: "Invalid academic year or stream for this university" }, { status: 400 });
  }

  const roleRow = await prisma.role.findUnique({
    where: { id: parsed.data.consultantRoleId },
    select: { id: true, slug: true },
  });
  if (!roleRow || !isAdmissionLeadRoleSlug(roleRow.slug)) {
    return NextResponse.json(
      { error: "Invalid role — choose a consultant or counsellor role from the directory." },
      { status: 400 },
    );
  }

  const lead = await prisma.admissionLead.create({
    data: {
      universityId,
      academicYearId: parsed.data.academicYearId,
      streamId: parsed.data.streamId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email.toLowerCase(),
      mobile: parsed.data.mobile,
      consultantCode: parsed.data.consultantCode,
      consultantRoleId: roleRow.id,
      admissionStatus: parsed.data.admissionStatus ?? AdmissionLeadStatus.NEW,
      pipelineStatus: LeadPipelineStatus.NEW,
      nationality: parsed.data.nationality ?? null,
      specialization: parsed.data.specialization,
      /** Always record creator so Admissions vs Uni-Admission lists can be split. */
      createdByUserId: session.sub,
    },
  });

  return NextResponse.json({ lead });
}
