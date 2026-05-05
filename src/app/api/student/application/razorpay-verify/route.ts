import { ApplicationPaymentStatus, ApplicationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { sendPaymentSuccessEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";
import { razorpayFetchPayment, razorpayVerifyPaymentSignature } from "@/lib/razorpay-server";
import { PROGRAM_PAISE, registrationPaiseForPath, type StudentAdmissionPath } from "@/lib/student-application-fees";

const bodySchema = z.object({
  applicationId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  kind: z.enum(["registration", "program", "custom"]),
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

  let amountOk = false;
  if (parsed.data.kind === "registration") {
    const expected = registrationPaiseForPath(app.admissionPath as StudentAdmissionPath | null);
    amountOk = pay.amount === expected;
  } else if (parsed.data.kind === "program") {
    amountOk = pay.amount === PROGRAM_PAISE;
  } else {
    amountOk = pay.amount >= 100 && pay.amount <= 50_000_000;
  }
  if (!amountOk) {
    return NextResponse.json({ error: "Payment amount does not match selected fee" }, { status: 400 });
  }

  if (parsed.data.kind === "registration" || parsed.data.kind === "custom") {
    if (app.paymentStatus !== ApplicationPaymentStatus.NONE && app.paymentStatus !== ApplicationPaymentStatus.REGISTRATION_PENDING) {
      return NextResponse.json({ error: "Registration fee already recorded" }, { status: 409 });
    }
    const updated = await prisma.application.update({
      where: { id: app.id },
      data: {
        paymentStatus: ApplicationPaymentStatus.REGISTRATION_PAID,
        status: ApplicationStatus.PROGRAM_FEE_PENDING,
        lastRazorpayOrderId: null,
      },
    });
    try {
      await sendPaymentSuccessEmail({
        to: session.email,
        name: app.user.name ?? app.user.email,
        amountLabel: `₹${(pay.amount / 100).toLocaleString("en-IN")} (Razorpay · ${parsed.data.kind})`,
        applicationId: app.id,
      });
    } catch (e) {
      console.error("sendPaymentSuccessEmail", e);
    }
    return NextResponse.json({ ok: true, application: updated });
  }

  /** program */
  if (app.paymentStatus === ApplicationPaymentStatus.PROGRAM_PAID) {
    return NextResponse.json({ error: "Program fee already paid" }, { status: 409 });
  }
  if (
    app.paymentStatus !== ApplicationPaymentStatus.REGISTRATION_PAID &&
    app.paymentStatus !== ApplicationPaymentStatus.PROGRAM_PENDING
  ) {
    return NextResponse.json({ error: "Pay registration fee before program fee" }, { status: 400 });
  }

  const updated = await prisma.application.update({
    where: { id: app.id },
    data: {
      paymentStatus: ApplicationPaymentStatus.PROGRAM_PAID,
      status: ApplicationStatus.COMPLETED,
      lastRazorpayOrderId: null,
    },
  });
  try {
    await sendPaymentSuccessEmail({
      to: session.email,
      name: app.user.name ?? app.user.email,
      amountLabel: `₹${(pay.amount / 100).toLocaleString("en-IN")} (Razorpay · program)`,
      applicationId: app.id,
    });
  } catch (e) {
    console.error("sendPaymentSuccessEmail", e);
  }

  return NextResponse.json({ ok: true, application: updated });
}
