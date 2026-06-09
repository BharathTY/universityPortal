import { NextResponse } from "next/server";
import { z } from "zod";
import { isPaidLeadStatus } from "@/lib/lead-status";
import { verifyLeadPaymentShareToken } from "@/lib/lead-payment-share-token";
import { completeLeadUpiPaymentFromShareLink, getLeadUpiPaymentPublicInfo } from "@/lib/lead-upi-payment-public";

const bodySchema = z.object({
  token: z.string().min(1),
  upiId: z.string().min(1).max(120),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id: leadId } = await ctx.params;

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

  const tokenOk = await verifyLeadPaymentShareToken(parsed.data.token, leadId);
  if (!tokenOk) {
    return NextResponse.json({ error: "Invalid or expired payment link" }, { status: 403 });
  }

  const info = await getLeadUpiPaymentPublicInfo(leadId);
  if (!info) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (isPaidLeadStatus(info.admissionStatus)) {
    return NextResponse.json({ ok: true, leadId, status: info.admissionStatus, alreadyPaid: true });
  }

  try {
    const completed = await completeLeadUpiPaymentFromShareLink({
      leadId,
      upiId: parsed.data.upiId.trim(),
    });

    if (!completed.ok) {
      return NextResponse.json({ error: completed.error }, { status: completed.status });
    }

    return NextResponse.json({ ok: true, leadId, status: completed.result.lead.admissionStatus });
  } catch (e) {
    console.error("pay/lead/confirm", e);
    return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
  }
}
