import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { createLeadPaymentShareToken, leadPaymentCompleteUrl, leadPaymentPageUrl } from "@/lib/lead-payment-share-token";
import { prisma } from "@/lib/prisma";
import { isConsultant } from "@/lib/roles";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session || !isConsultant(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await getAllowedConsultantUniversityIds(session.sub);
  if (allowed.length === 0) {
    return NextResponse.json({ error: "No universities assigned" }, { status: 400 });
  }

  const { id: leadId } = await ctx.params;

  const lead = await prisma.admissionLead.findFirst({
    where: { id: leadId, universityId: { in: allowed }, createdByUserId: session.sub },
    select: { id: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const token = await createLeadPaymentShareToken(leadId);
  return NextResponse.json({
    token,
    paymentPageUrl: leadPaymentPageUrl(leadId, token),
    paymentCompleteUrl: leadPaymentCompleteUrl(leadId, token),
  });
}
