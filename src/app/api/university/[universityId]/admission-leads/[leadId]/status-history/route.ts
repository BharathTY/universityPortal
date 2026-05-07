import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessUniversityScopeAsync } from "@/lib/university-scope";

type RouteContext = { params: Promise<{ universityId: string; leadId: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { universityId, leadId } = await ctx.params;
  if (!(await canAccessUniversityScopeAsync(session, universityId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const lead = await prisma.admissionLead.findFirst({
    where: { id: leadId, universityId },
    select: { id: true },
  });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const entries = await prisma.admissionLeadStatusHistory.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    include: { changedBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      createdAt: e.createdAt.toISOString(),
      changedBy: e.changedBy,
    })),
  });
}
