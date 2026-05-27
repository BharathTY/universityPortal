import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getStudentApplication } from "@/lib/student-application-data";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";
import { getRazorpayKeyIdPublic, isRazorpayConfigured, razorpayCreateOrder } from "@/lib/razorpay-server";
import { studentPaymentPanelState } from "@/lib/student-portal";

const bodySchema = z.object({
  applicationId: z.string().min(1),
  /** Amount in paise for partial application fee payment. */
  amountPaise: z.number().int().min(100).max(50_000_000),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      {
        error:
          "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or use simulated pay in development.",
      },
      { status: 503 },
    );
  }

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

  const appData = await getStudentApplication(session.sub, parsed.data.applicationId);
  if (!appData) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const { paymentSummary, lead } = appData;
  const panelState = studentPaymentPanelState(
    lead?.admissionStatus ?? null,
    paymentSummary.applicationFee,
    paymentSummary.paidRupees,
  );

  if (panelState !== "ready_to_pay") {
    return NextResponse.json(
      { error: "Payment is not available until your consultant marks the lead as Ready to Pay." },
      { status: 409 },
    );
  }

  const remainingPaise = Math.round(paymentSummary.remainingDue * 100);
  if (remainingPaise <= 0) {
    return NextResponse.json({ error: "Application fee is already fully paid" }, { status: 409 });
  }

  if (parsed.data.amountPaise > remainingPaise) {
    return NextResponse.json(
      { error: `Amount cannot exceed remaining due of ₹${paymentSummary.remainingDue.toLocaleString("en-IN")}` },
      { status: 400 },
    );
  }

  const order = await razorpayCreateOrder({
    amountPaise: parsed.data.amountPaise,
    receipt: `app_${appData.id}`.slice(0, 40),
    notes: {
      applicationId: appData.id,
      kind: "application",
      userId: session.sub,
      leadId: lead?.id ?? "",
    },
  });

  if (!order.ok) {
    return NextResponse.json({ error: order.error }, { status: 502 });
  }

  await prisma.application.update({
    where: { id: appData.id },
    data: { lastRazorpayOrderId: order.orderId },
  });

  const keyId = getRazorpayKeyIdPublic();
  if (!keyId) {
    return NextResponse.json({ error: "RAZORPAY_KEY_ID is not set" }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.orderId,
    amount: order.amount,
    currency: order.currency,
    keyId,
    kind: "application",
  });
}
