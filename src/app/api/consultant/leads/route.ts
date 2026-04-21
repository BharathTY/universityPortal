import { AdmissionLeadStatus, LeadPipelineStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdmissionLeadRoleSlug } from "@/lib/admission-lead-role";
import { resolveAcademicYearIdForLead } from "@/lib/consultant-default-year";
import { consultantCodeFromUserId } from "@/lib/consultant-code";
import { requireConsultantUniversity } from "@/lib/consultant-api";

const createSchema = z.object({
  academicYearId: z.string().min(1).optional(),
  streamId: z.string().min(1),
  firstName: z.string().min(1).max(120).trim(),
  lastName: z.string().min(1).max(120).trim(),
  email: z.string().email().max(254).trim(),
  mobile: z.string().min(5).max(32).trim(),
  nationality: z.string().max(120).trim().optional().nullable(),
  admissionState: z.string().min(1).max(120).trim(),
  referralFirstName: z.string().max(120).trim().optional().nullable(),
  referralLastName: z.string().max(120).trim().optional().nullable(),
  referralPhone: z.string().max(32).trim().optional().nullable(),
  referralEmail: z.string().max(254).trim().optional().nullable(),
});

export async function GET(req: Request) {
  const gate = await requireConsultantUniversity();
  if (!gate.ok) return gate.response;
  const { session, universityId } = gate;

  const url = new URL(req.url);
  const pipelineRaw = url.searchParams.get("pipeline");
  const pipeline =
    pipelineRaw === "NEW" || pipelineRaw === "LOST" || pipelineRaw === "CONVERTED"
      ? (pipelineRaw as LeadPipelineStatus)
      : null;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(url.searchParams.get("pageSize") ?? "20") || 20));

  const where = {
    universityId,
    createdByUserId: session.sub,
    ...(pipeline ? { pipelineStatus: pipeline } : {}),
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
        university: { select: { name: true, code: true } },
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

export async function POST(req: Request) {
  const gate = await requireConsultantUniversity();
  if (!gate.ok) return gate.response;
  const { session, universityId } = gate;

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

  const [yearId, stream, roleRow, creator] = await Promise.all([
    resolveAcademicYearIdForLead(universityId, parsed.data.academicYearId ?? null),
    prisma.stream.findFirst({
      where: { id: parsed.data.streamId, universityId },
    }),
    prisma.userRole.findMany({
      where: { userId: session.sub },
      include: { role: true },
    }),
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { name: true, branchName: true, email: true },
    }),
  ]);

  if (!yearId || !stream) {
    return NextResponse.json(
      { error: "Configure at least one academic year and a valid stream for this university" },
      { status: 400 },
    );
  }

  const consultantRole = roleRow.find((r) => isAdmissionLeadRoleSlug(r.role.slug));
  if (!consultantRole) {
    return NextResponse.json({ error: "No admission partner role on your account" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const dup = await prisma.admissionLead.findFirst({
    where: { universityId, email },
  });
  if (dup) {
    return NextResponse.json({ error: "A lead with this email already exists for this university" }, { status: 409 });
  }

  let referralEmail: string | null = null;
  const refE = parsed.data.referralEmail?.trim();
  if (refE) {
    const ok = z.string().email().safeParse(refE);
    if (!ok.success) {
      return NextResponse.json({ error: "Invalid referral email" }, { status: 400 });
    }
    referralEmail = refE.toLowerCase();
  }

  const lead = await prisma.admissionLead.create({
    data: {
      universityId,
      academicYearId: yearId,
      streamId: parsed.data.streamId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email,
      mobile: parsed.data.mobile,
      consultantCode: consultantCodeFromUserId(session.sub),
      consultantRoleId: consultantRole.roleId,
      admissionStatus: AdmissionLeadStatus.NEW,
      pipelineStatus: LeadPipelineStatus.NEW,
      nationality: parsed.data.nationality ?? null,
      admissionState: parsed.data.admissionState,
      referralFirstName: parsed.data.referralFirstName?.trim() || null,
      referralLastName: parsed.data.referralLastName?.trim() || null,
      referralPhone: parsed.data.referralPhone?.trim() || null,
      referralEmail,
      branchName: creator?.branchName?.trim() || null,
      createdByUserId: session.sub,
    },
  });

  return NextResponse.json({ lead });
}
