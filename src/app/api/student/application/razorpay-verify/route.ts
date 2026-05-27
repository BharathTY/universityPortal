import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { sendPaymentSuccessEmail } from "@/lib/email";
import { getStudentApplication } from "@/lib/student-application-data";
import { isStudent } from "@/lib/roles";
import { razorpayFetchPayment, razorpayVerifyPaymentSignature } from "@/lib/razorpay-server";
import { recordApplicationPayment } from "@/lib/student-payment";
import { studentPaymentPanelState } from "@/lib/student-portal";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  applicationId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const app = await prisma.application.findFirst({
    where: { id: parsed.data.applicationId, userId: session.sub },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (app.lastRazorpayOrderId && app.lastRazorpayOrderId !== parsed.data.razorpay_order_id) {
    return NextResponse.json({ error: "Order mismatch — create a new payment from this page." }, { status: 400 });
  }

  const panelState = studentPaymentPanelState(
    appData.lead?.admissionStatus ?? null,
    appData.paymentSummary.applicationFee,
    appData.paymentSummary.paidRupees,
  );
  if (panelState !== "ready_to_pay") {
    return NextResponse.json({ error: "Payment is not available for this application" }, { status: 409 });
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

  const remainingPaise = Math.round(appData.paymentSummary.remainingDue * 100);
  if (pay.amount < 100 || pay.amount > remainingPaise) {
    return NextResponse.json({ error: "Payment amount exceeds remaining application fee due" }, { status: 400 });
  }

  const amountRupees = pay.amount / 100;

  await recordApplicationPayment({
    applicationId: app.id,
    userId: session.sub,
    amountRupees,
    paymentMethod: "razorpay",
    leadId: appData.lead?.id ?? null,
    applicationFee: appData.paymentSummary.applicationFee,
    paidBefore: appData.paymentSummary.paidRupees,
  });

  try {
    await sendPaymentSuccessEmail({
      to: session.email,
      name: app.user.name ?? app.user.email,
      amountLabel: `₹${amountRupees.toLocaleString("en-IN")} (Razorpay · application fee)`,
      applicationId: app.referenceCode ?? app.id,
    });
  } catch (e) {
    console.error("sendPaymentSuccessEmail", e);
  }

  return NextResponse.json({ ok: true });
}
