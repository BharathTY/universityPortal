import { NextResponse } from "next/server";
import { AdmissionLeadStatus, LeadPipelineStatus } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isAdmissionLeadRoleSlug } from "@/lib/admission-lead-role";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { canAccessUniversityScopeAsync } from "@/lib/university-scope";

const createSchema = z
  .object({
    academicYearId: z.string().min(1),
    streamId: z.string().min(1),
    firstName: z.string().min(1).max(120).trim(),
    lastName: z.string().min(1).max(120).trim(),
    email: z.string().email().max(254).trim(),
    mobile: z.string().min(5).max(32).trim(),
    /** Display name for the admission guide (stored in `consultantCode` column for attribution). */
    admissionGuideName: z.string().min(1).max(200).trim(),
    /** `consultant` = partner attribution; `university` = college staff lead. */
    admissionBy: z.enum(["consultant", "university"]),
    /** `Role.id` — required when `admissionBy` is `consultant` (partner directory role). */
    consultantRoleId: z.string().optional(),
    nationality: z.string().max(120).trim().optional().nullable(),
    specialization: z.string().min(1).max(200).trim(),
  })
  .superRefine((data, ctx) => {
    if (data.admissionBy === "consultant" && (!data.consultantRoleId || !data.consultantRoleId.trim())) {
      ctx.addIssue({
        code: "custom",
        message: "Partner role is required when admission is by consultant",
        path: ["consultantRoleId"],
      });
    }
  });

type RouteContext = { params: Promise<{ universityId: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { universityId } = await ctx.params;
  if (!(await canAccessUniversityScopeAsync(session, universityId))) {
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
  if (!(await canAccessUniversityScopeAsync(session, universityId))) {
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

  let roleRow: { id: string; slug: string } | null = null;
  if (parsed.data.admissionBy === "university") {
    roleRow = await prisma.role.findUnique({
      where: { slug: ROLES.university },
      select: { id: true, slug: true },
    });
    if (!roleRow) {
      return NextResponse.json({ error: "University role is not configured in the directory." }, { status: 500 });
    }
  } else {
    const r = await prisma.role.findUnique({
      where: { id: parsed.data.consultantRoleId! },
      select: { id: true, slug: true },
    });
    if (!r || !isAdmissionLeadRoleSlug(r.slug)) {
      return NextResponse.json(
        { error: "Invalid role — choose a partner role (consultant, counsellor, etc.) from the directory." },
        { status: 400 },
      );
    }
    roleRow = r;
  }

  const guideStored = parsed.data.admissionGuideName.slice(0, 200);

  const lead = await prisma.admissionLead.create({
    data: {
      universityId,
      academicYearId: parsed.data.academicYearId,
      streamId: parsed.data.streamId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email.toLowerCase(),
      mobile: parsed.data.mobile,
      consultantCode: guideStored,
      consultantRoleId: roleRow.id,
      admissionStatus: AdmissionLeadStatus.NEW,
      pipelineStatus: LeadPipelineStatus.NEW,
      nationality: parsed.data.nationality ?? null,
      specialization: parsed.data.specialization,
      createdByUserId: session.sub,
    },
  });

  return NextResponse.json({ lead });
}
