import { AdmissionLeadStatus, LeadPipelineStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmissionLeadRoleSlug } from "@/lib/admission-lead-role";
import { resolveAcademicYearIdForLead } from "@/lib/consultant-default-year";
import { consultantCodeFromUserId } from "@/lib/consultant-code";
import { requireConsultantUniversity } from "@/lib/consultant-api";
import {
  getConsultantLeadsFilterOptions,
  getConsultantLeadsSummary,
  listConsultantLeads,
  parseConsultantLeadsQueryFromSearchParams,
} from "@/lib/consultant-leads-data";
import {
  buildLeadExtendedData,
  consultantLeadBodySchema,
  parseConsultantLeadRequest,
  replaceLeadEntranceExams,
} from "@/lib/consultant-lead-payload";
import { sendAdmissionLeadWelcomeEmail } from "@/lib/email";
import { ensureStudentApplicationForLead } from "@/lib/ensure-student-for-lead";
import { storeUpload } from "@/lib/file-storage";
import { leadOrderBy, leadTextSearchWhere, parsePage, parsePageSize } from "@/lib/list-query";
import { canSeeAdmissionLeadAssignedPartnerName } from "@/lib/roles";

const createSchema = consultantLeadBodySchema;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scopeAll = url.searchParams.get("scope") === "all";
  const scoped = url.searchParams.get("universityId")?.trim() || null;
  const pipelineRaw = url.searchParams.get("pipeline");
  const pipeline =
    pipelineRaw === "NEW" || pipelineRaw === "LOST" || pipelineRaw === "CONVERTED"
      ? (pipelineRaw as LeadPipelineStatus)
      : null;
  const page = parsePage(url.searchParams.get("page") ?? undefined);
  const pageSize = parsePageSize(url.searchParams.get("pageSize") ?? undefined, 20, 100);
  const q = url.searchParams.get("q")?.trim() || undefined;
  const sort = url.searchParams.get("sort")?.trim() || "latest";

  let session: SessionPayload;
  let baseWhere: {
    createdByUserId: string;
    universityId?: string | { in: string[] };
    pipelineStatus?: LeadPipelineStatus;
  };

  if (scopeAll) {
    const gate = await requireConsultantUniversity(null);
    if (!gate.ok) return gate.response;
    session = gate.session;

    const query = parseConsultantLeadsQueryFromSearchParams({
      q: url.searchParams.get("q") ?? undefined,
      universityId: url.searchParams.get("universityId") ?? undefined,
      streamId: url.searchParams.get("streamId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      createdFrom: url.searchParams.get("createdFrom") ?? undefined,
      createdTo: url.searchParams.get("createdTo") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    const [list, summary, filterOptions] = await Promise.all([
      listConsultantLeads(session.sub, query),
      getConsultantLeadsSummary(session.sub),
      getConsultantLeadsFilterOptions(session.sub),
    ]);

    return NextResponse.json({
      leads: list.leads,
      total: list.total,
      page: list.page,
      pageSize: list.pageSize,
      totalPages: list.totalPages,
      summary,
      filterOptions,
    });
  } else {
    const gate = await requireConsultantUniversity(scoped);
    if (!gate.ok) return gate.response;
    session = gate.session;
    baseWhere = {
      universityId: gate.universityId,
      createdByUserId: session.sub,
      ...(pipeline ? { pipelineStatus: pipeline } : {}),
    };
  }

  const textWhere = leadTextSearchWhere(q);
  const where = textWhere ? { AND: [baseWhere, textWhere] } : baseWhere;

  const [total, leads] = await Promise.all([
    prisma.admissionLead.count({ where }),
    prisma.admissionLead.findMany({
      where,
      orderBy: leadOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        academicYear: { select: { label: true } },
        stream: { select: { name: true } },
        university: { select: { name: true, code: true, registrationFee: true } },
      },
    }),
  ]);

  const canSeePartner = canSeeAdmissionLeadAssignedPartnerName(session.roles);
  const leadsOut = canSeePartner
    ? leads
    : leads.map((row) => {
        const { assignedPartnerDisplayName, ...rest } = row;
        void assignedPartnerDisplayName;
        return rest;
      });

  return NextResponse.json({
    leads: leadsOut,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: Request) {
  let json: unknown;
  let photoFile: File | null = null;
  let sslcMarksCardFile: File | null = null;
  let qualMarksCardFile: File | null = null;
  try {
    const parsedReq = await parseConsultantLeadRequest(req);
    json = parsedReq.data;
    photoFile = parsedReq.photoFile;
    sslcMarksCardFile = parsedReq.sslcMarksCardFile;
    qualMarksCardFile = parsedReq.qualMarksCardFile;
  } catch {
    return NextResponse.json({ error: "Invalid JSON or form data" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid input",
        fieldErrors: flat.fieldErrors,
        formErrors: flat.formErrors,
      },
      { status: 400 },
    );
  }

  let photoUrl: string | null = null;
  if (photoFile) {
    try {
      const stored = await storeUpload(photoFile, "leads/photos", "image");
      photoUrl = stored.fileUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Photo upload failed";
      return NextResponse.json(
        { error: msg, fieldErrors: { photoFile: [msg] } },
        { status: 400 },
      );
    }
  }

  let sslcMarksCardUrl: string | null = null;
  if (sslcMarksCardFile) {
    try {
      const stored = await storeUpload(sslcMarksCardFile, "leads/marks-cards", "mou", {
        maxBytes: 5 * 1024 * 1024,
      });
      sslcMarksCardUrl = stored.fileUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "10th marks card upload failed";
      return NextResponse.json(
        { error: msg, fieldErrors: { sslcMarksCardFile: [msg] } },
        { status: 400 },
      );
    }
  }

  let qualMarksCardUrl: string | null = null;
  if (qualMarksCardFile) {
    try {
      const stored = await storeUpload(qualMarksCardFile, "leads/marks-cards", "mou", {
        maxBytes: 5 * 1024 * 1024,
      });
      qualMarksCardUrl = stored.fileUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Qualification marks card upload failed";
      return NextResponse.json(
        { error: msg, fieldErrors: { qualMarksCardFile: [msg] } },
        { status: 400 },
      );
    }
  }

  const gate = await requireConsultantUniversity(parsed.data.universityId ?? null);
  if (!gate.ok) return gate.response;
  const { session, universityId } = gate;

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

  let extended;
  try {
    extended = buildLeadExtendedData(parsed.data);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "INVALID_REFERRAL_EMAIL") {
      return NextResponse.json(
        {
          error: "Invalid input",
          fieldErrors: { referralEmail: ["Enter a valid email address"] },
          formErrors: [],
        },
        { status: 400 },
      );
    }
    if (code === "INVALID_REFERRAL_PHONE") {
      return NextResponse.json(
        {
          error: "Invalid input",
          fieldErrors: { referralPhone: ["Enter a valid contact number (at least 10 digits)"] },
          formErrors: [],
        },
        { status: 400 },
      );
    }
    throw e;
  }

  const email = extended.email;
  const dup = await prisma.admissionLead.findFirst({
    where: { universityId, email },
  });
  if (dup) {
    return NextResponse.json({ error: "A lead with this email already exists for this university" }, { status: 409 });
  }

  const assignedPartnerDisplayName = (creator?.name?.trim() || creator?.email?.trim() || "Admission partner").slice(
    0,
    200,
  );

  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.admissionLead.create({
      data: {
        universityId,
        academicYearId: yearId,
        streamId: parsed.data.streamId,
        consultantCode: consultantCodeFromUserId(session.sub),
        consultantRoleId: consultantRole.roleId,
        admissionStatus: AdmissionLeadStatus.NEW_LEAD,
        pipelineStatus: LeadPipelineStatus.NEW,
        photoUrl,
        sslcMarksCardUrl,
        qualMarksCardUrl,
        branchName: creator?.branchName?.trim() || null,
        createdByUserId: session.sub,
        assignedPartnerDisplayName,
        ...extended,
      },
    });
    await replaceLeadEntranceExams(tx, created.id, parsed.data.hasEntranceExams, parsed.data.entranceExams);
    return created;
  });

  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
  try {
    await sendAdmissionLeadWelcomeEmail({
      to: email,
      name: fullName || parsed.data.firstName,
      universityName: (await prisma.university.findUnique({ where: { id: universityId }, select: { name: true } }))
        ?.name ?? "the university",
      partnerLabel: assignedPartnerDisplayName,
    });
  } catch (e) {
    console.error("sendAdmissionLeadWelcomeEmail", e);
  }

  const ensured = await ensureStudentApplicationForLead({
    leadId: lead.id,
    consultantUserId: session.sub,
  });
  if (!ensured.ok) {
    console.warn("ensureStudentApplicationForLead on create", ensured.error);
  }

  return NextResponse.json({ lead });
}
