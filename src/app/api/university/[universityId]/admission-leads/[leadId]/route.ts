import { AdmissionLeadStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessUniversityScopeAsync } from "@/lib/university-scope";

const patchSchema = z.object({
  admissionStatus: z.nativeEnum(AdmissionLeadStatus),
});

type RouteContext = { params: Promise<{ universityId: string; leadId: string }> };

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { universityId, leadId } = await ctx.params;
  if (!(await canAccessUniversityScopeAsync(session, universityId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const lead = await prisma.admissionLead.findFirst({
    where: { id: leadId, universityId },
  });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.admissionStatus === parsed.data.admissionStatus) {
    return NextResponse.json({ lead });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.admissionLeadStatusHistory.create({
        data: {
          leadId,
          fromStatus: lead.admissionStatus,
          toStatus: parsed.data.admissionStatus,
          changedByUserId: session.sub,
        },
      });
      return tx.admissionLead.update({
        where: { id: leadId },
        data: { admissionStatus: parsed.data.admissionStatus },
      });
    });
    return NextResponse.json({ lead: updated });
  } catch (e) {
    console.error("admission-lead PATCH", e);
    return NextResponse.json({ error: "Could not update status" }, { status: 500 });
  }
}
