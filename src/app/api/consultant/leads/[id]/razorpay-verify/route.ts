import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { completeConsultantLeadPayment } from "@/lib/consultant-lead-payment";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { parseAmountRupees } from "@/lib/payment-amount";
import { PaymentCollectedBy } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  razorpayFetchPayment,
  razorpayVerifyPaymentSignature,
} from "@/lib/razorpay-server";
import { isConsultant, isConsultantSpoc } from "@/lib/roles";

const bodySchema = z.object({
  amountRupees: z.union([z.number(), z.string()]),
  remarks: z.string().max(500).trim().optional().nullable(),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session || !isConsultant(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const amountParsed = parseAmountRupees(String(parsed.data.amountRupees));
  if (!amountParsed.ok) {
    return NextResponse.json({ error: amountParsed.error }, { status: 400 });
  }

  const allowed = await getAllowedConsultantUniversityIds(session.sub);
  const lead = await prisma.admissionLead.findFirst({
    where: { id: leadId, universityId: { in: allowed }, createdByUserId: session.sub },
    select: { id: true, admissionStatus: true, lastRazorpayOrderId: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.admissionStatus !== "READY_TO_PAY") {
    return NextResponse.json({ error: "Lead must be in Ready to Pay status" }, { status: 409 });
  }

  if (lead.lastRazorpayOrderId && lead.lastRazorpayOrderId !== parsed.data.razorpay_order_id) {
    return NextResponse.json({ error: "Order mismatch — create a new payment." }, { status: 400 });
  }

  const sigOk = razorpayVerifyPaymentSignature(
    parsed.data.razorpay_order_id,
    parsed.data.razorpay_payment_id,
    parsed.data.razorpay_signature,
  );
  if (!sigOk) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  const pay = await razorpayFetchPayment(parsed.data.razorpay_payment_id);
  if (!pay.ok) {
    return NextResponse.json({ error: pay.error }, { status: 502 });
  }

  if (pay.orderId !== parsed.data.razorpay_order_id) {
    return NextResponse.json({ error: "Payment does not match order" }, { status: 400 });
  }

  const okStatus = pay.status === "captured" || pay.status === "authorized";
  if (!okStatus) {
    return NextResponse.json({ error: `Payment not completed (status: ${pay.status})` }, { status: 400 });
  }

  const expectedPaise = Math.round(amountParsed.value * 100);
  if (pay.amount !== expectedPaise) {
    return NextResponse.json({ error: "Payment amount does not match" }, { status: 400 });
  }

  const remarks = parsed.data.remarks?.trim();
  const paymentMethod = [
    "Razorpay",
    `Payment ID ${parsed.data.razorpay_payment_id}`,
    remarks ? `Remarks: ${remarks}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const completed = await completeConsultantLeadPayment({
    leadId,
    userId: session.sub,
    roles: session.roles,
    paymentMethod,
    amount: new Prisma.Decimal(amountParsed.value.toFixed(2)),
    collectedBy: isConsultantSpoc(session.roles) ? PaymentCollectedBy.SPOC : PaymentCollectedBy.CONSULTANT,
  });

  if (!completed.ok) {
    return NextResponse.json({ error: completed.error }, { status: completed.status });
  }

  await prisma.admissionLead.update({
    where: { id: leadId },
    data: { lastRazorpayOrderId: null },
  });

  return NextResponse.json({ ok: true, lead: completed.result.lead });
}
