import { LeadPipelineStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultant } from "@/lib/roles";

const patchSchema = z.object({
  firstName: z.string().min(1).max(120).trim().optional(),
  lastName: z.string().min(1).max(120).trim().optional(),
  email: z.string().email().max(254).trim().optional(),
  mobile: z.string().min(5).max(32).trim().optional(),
  nationality: z.string().max(120).trim().optional().nullable(),
  pipelineStatus: z.nativeEnum(LeadPipelineStatus).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isConsultant(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const allowed = await getAllowedConsultantUniversityIds(session.sub);
  if (allowed.length === 0) {
    return NextResponse.json({ error: "No universities assigned" }, { status: 400 });
  }
  const { id } = await ctx.params;

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

  const existing = await prisma.admissionLead.findFirst({
    where: { id, universityId: { in: allowed }, createdByUserId: session.sub },
  });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  const universityId = existing.universityId;

  if (existing.pipelineStatus === LeadPipelineStatus.CONVERTED && parsed.data.pipelineStatus === LeadPipelineStatus.LOST) {
    return NextResponse.json({ error: "Cannot mark a converted lead as lost" }, { status: 400 });
  }

  if (parsed.data.email && parsed.data.email.toLowerCase() !== existing.email) {
    const clash = await prisma.admissionLead.findFirst({
      where: { universityId, email: parsed.data.email.toLowerCase(), NOT: { id } },
    });
    if (clash) {
      return NextResponse.json({ error: "Email already used by another lead" }, { status: 409 });
    }
  }

  const lead = await prisma.admissionLead.update({
    where: { id },
    data: {
      ...(parsed.data.firstName !== undefined ? { firstName: parsed.data.firstName } : {}),
      ...(parsed.data.lastName !== undefined ? { lastName: parsed.data.lastName } : {}),
      ...(parsed.data.email !== undefined ? { email: parsed.data.email.toLowerCase() } : {}),
      ...(parsed.data.mobile !== undefined ? { mobile: parsed.data.mobile } : {}),
      ...(parsed.data.nationality !== undefined ? { nationality: parsed.data.nationality } : {}),
      ...(parsed.data.pipelineStatus !== undefined ? { pipelineStatus: parsed.data.pipelineStatus } : {}),
    },
  });

  return NextResponse.json({ lead });
}
