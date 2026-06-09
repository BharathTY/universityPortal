import { NextResponse } from "next/server";
import { verifyLeadPaymentShareToken } from "@/lib/lead-payment-share-token";
import { getLeadUpiPaymentPublicInfo } from "@/lib/lead-upi-payment-public";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id: leadId } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t")?.trim() ?? "";

  if (!token || !(await verifyLeadPaymentShareToken(token, leadId))) {
    return NextResponse.json({ error: "Invalid or expired payment link" }, { status: 403 });
  }

  const info = await getLeadUpiPaymentPublicInfo(leadId);
  if (!info) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(info);
}
