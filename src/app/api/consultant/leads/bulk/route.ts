import { AdmissionLeadStatus, LeadPipelineStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdmissionLeadRoleSlug } from "@/lib/admission-lead-role";
import { resolveAcademicYearIdForLead } from "@/lib/consultant-default-year";
import { consultantCodeFromUserId } from "@/lib/consultant-code";
import { requireConsultantUniversity } from "@/lib/consultant-api";

const rowSchema = z.object({
  firstName: z.string().min(1).max(120).trim(),
  lastName: z.string().min(1).max(120).trim(),
  email: z.string().email().max(254).trim(),
  mobile: z.string().min(5).max(32).trim(),
  academicYearLabel: z.string().max(32).trim().optional().nullable(),
  streamName: z.string().min(1).max(120).trim(),
  nationality: z.string().max(120).trim().optional().nullable(),
  admissionState: z.string().max(120).trim().optional().nullable(),
  referralFirstName: z.string().max(120).trim().optional().nullable(),
  referralLastName: z.string().max(120).trim().optional().nullable(),
  referralPhone: z.string().max(32).trim().optional().nullable(),
  referralEmail: z.string().max(254).trim().optional().nullable(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
});

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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const roleRows = await prisma.userRole.findMany({
    where: { userId: session.sub },
    include: { role: true },
  });
  const consultantRole = roleRows.find((r) => isAdmissionLeadRoleSlug(r.role.slug));
  if (!consultantRole) {
    return NextResponse.json({ error: "No admission partner role on your account" }, { status: 400 });
  }

  const creator = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { branchName: true, name: true, email: true },
  });
  const assignedPartnerDisplayName = (creator?.name?.trim() || creator?.email?.trim() || "Admission partner").slice(
    0,
    200,
  );

  const [years, streams] = await Promise.all([
    prisma.academicYear.findMany({ where: { universityId } }),
    prisma.stream.findMany({ where: { universityId } }),
  ]);

  const errors: { row: number; message: string }[] = [];
  let created = 0;

  const seenEmail = new Set<string>();
  const seenMobile = new Set<string>();

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i]!;
    const rowNum = i + 1;
    const email = row.email.toLowerCase();
    if (seenEmail.has(email)) {
      errors.push({ row: rowNum, message: "Duplicate email in file" });
      continue;
    }
    const mob = row.mobile.replace(/\s+/g, "");
    if (seenMobile.has(mob)) {
      errors.push({ row: rowNum, message: "Duplicate mobile in file" });
      continue;
    }
    seenEmail.add(email);
    seenMobile.add(mob);

    const stateTrim = row.admissionState?.trim();
    if (!stateTrim) {
      errors.push({ row: rowNum, message: "Admission state is required (column: admission state or state)" });
      continue;
    }

    let streamKey = row.streamName.trim().toLowerCase();
    /** Common typo from brochures / manual entry — map to B.Tech when that stream exists. */
    if (streamKey === "ebgineering" || streamKey === "enginering") {
      const btech = streams.find((s) => /^b\.?\s*tech$/i.test(s.name.trim()));
      if (btech) streamKey = btech.name.trim().toLowerCase();
    }
    const stream = streams.find((s) => s.name.trim().toLowerCase() === streamKey);
    if (!stream) {
      const hint = streams.length ? ` Available: ${streams.map((s) => s.name).join(", ")}.` : "";
      errors.push({ row: rowNum, message: `Unknown stream/program: "${row.streamName}".${hint}` });
      continue;
    }

    let yearId: string | null = null;
    const yLabel = row.academicYearLabel?.trim();
    if (yLabel) {
      const yNorm = yLabel.toLowerCase();
      const year = years.find((y) => y.label.trim().toLowerCase() === yNorm);
      if (!year) {
        errors.push({ row: rowNum, message: `Unknown academic year: ${yLabel}` });
        continue;
      }
      yearId = year.id;
    } else {
      yearId = await resolveAcademicYearIdForLead(universityId, null);
    }
    if (!yearId) {
      errors.push({ row: rowNum, message: "No academic year configured for this university" });
      continue;
    }

    let referralEmail: string | null = null;
    const refE = row.referralEmail?.trim();
    if (refE) {
      const ok = z.string().email().safeParse(refE);
      if (!ok.success) {
        errors.push({ row: rowNum, message: "Invalid referral email" });
        continue;
      }
      referralEmail = refE.toLowerCase();
    }

    const dup = await prisma.admissionLead.findFirst({ where: { universityId, email } });
    if (dup) {
      errors.push({ row: rowNum, message: "Lead email already exists" });
      continue;
    }

    try {
      await prisma.admissionLead.create({
        data: {
          universityId,
          academicYearId: yearId,
          streamId: stream.id,
          firstName: row.firstName,
          lastName: row.lastName,
          email,
          mobile: row.mobile,
          consultantCode: consultantCodeFromUserId(session.sub),
          consultantRoleId: consultantRole.roleId,
          admissionStatus: AdmissionLeadStatus.NEW,
          pipelineStatus: LeadPipelineStatus.NEW,
          nationality: row.nationality ?? null,
          specialization: "Bulk CSV",
          admissionState: stateTrim,
          referralFirstName: row.referralFirstName?.trim() || null,
          referralLastName: row.referralLastName?.trim() || null,
          referralPhone: row.referralPhone?.trim() || null,
          referralEmail,
          branchName: creator?.branchName?.trim() || null,
          createdByUserId: session.sub,
          assignedPartnerDisplayName,
        },
      });
      created += 1;
    } catch (e) {
      errors.push({ row: rowNum, message: e instanceof Error ? e.message : "Create failed" });
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    failed: errors.length,
    errors,
  });
}
