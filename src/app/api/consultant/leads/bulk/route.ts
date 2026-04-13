import { AdmissionLeadStatus, LeadPipelineStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdmissionLeadRoleSlug } from "@/lib/admission-lead-role";
import { consultantCodeFromUserId } from "@/lib/consultant-code";
import { requireConsultantUniversity } from "@/lib/consultant-api";

const rowSchema = z.object({
  firstName: z.string().min(1).max(120).trim(),
  lastName: z.string().min(1).max(120).trim(),
  email: z.string().email().max(254).trim(),
  mobile: z.string().min(5).max(32).trim(),
  academicYearLabel: z.string().min(1).max(32).trim(),
  streamName: z.string().min(1).max(120).trim(),
  nationality: z.string().max(120).trim().optional().nullable(),
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
    return NextResponse.json({ error: "No consultant role on your account" }, { status: 400 });
  }

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

    const year = years.find((y) => y.label.trim() === row.academicYearLabel.trim());
    const stream = streams.find((s) => s.name.trim() === row.streamName.trim());
    if (!year) {
      errors.push({ row: rowNum, message: `Unknown academic year: ${row.academicYearLabel}` });
      continue;
    }
    if (!stream) {
      errors.push({ row: rowNum, message: `Unknown stream/program: ${row.streamName}` });
      continue;
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
          academicYearId: year.id,
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
          createdByUserId: session.sub,
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
