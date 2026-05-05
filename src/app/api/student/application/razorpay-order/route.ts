import { ApplicationPaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";
import { getRazorpayKeyIdPublic, isRazorpayConfigured, razorpayCreateOrder } from "@/lib/razorpay-server";
import { PROGRAM_PAISE, registrationPaiseForPath, type StudentAdmissionPath } from "@/lib/student-application-fees";

const bodySchema = z.object({
  applicationId: z.string().min(1),
  kind: z.enum(["registration", "program", "custom"]),
  /** Required when kind is `custom` — amount in paise (e.g. ₹500 → 50000). */
  customAmountPaise: z.number().int().min(100).max(50_000_000).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or use simulated pay in development." },
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

  if (parsed.data.kind === "custom" && parsed.data.customAmountPaise == null) {
    return NextResponse.json({ error: "customAmountPaise is required for custom payments" }, { status: 400 });
  }

  const app = await prisma.application.findFirst({
    where: { id: parsed.data.applicationId, userId: session.sub },
    select: { id: true, paymentStatus: true, admissionPath: true },
  });
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const canPayRegistration =
    app.paymentStatus === ApplicationPaymentStatus.NONE ||
    app.paymentStatus === ApplicationPaymentStatus.REGISTRATION_PENDING;
  const canPayProgram =
    app.paymentStatus === ApplicationPaymentStatus.REGISTRATION_PAID ||
    app.paymentStatus === ApplicationPaymentStatus.PROGRAM_PENDING;

  if (parsed.data.kind === "registration" && !canPayRegistration) {
    return NextResponse.json({ error: "Registration is already recorded" }, { status: 409 });
  }
  if (parsed.data.kind === "custom" && !canPayRegistration) {
    return NextResponse.json({ error: "Custom registration payment is already recorded" }, { status: 409 });
  }
  if (parsed.data.kind === "program" && !canPayProgram) {
    return NextResponse.json({ error: "Program fee is not available yet or already paid" }, { status: 409 });
  }

  if (parsed.data.kind === "registration" && !app.admissionPath) {
    return NextResponse.json(
      { error: "Choose national exam or direct admission before paying the registration fee." },
      { status: 400 },
    );
  }

  let amountPaise: number;
  if (parsed.data.kind === "registration") {
    amountPaise = registrationPaiseForPath(app.admissionPath as StudentAdmissionPath | null);
  } else if (parsed.data.kind === "program") {
    amountPaise = PROGRAM_PAISE;
  } else {
    amountPaise = parsed.data.customAmountPaise!;
  }

  const order = await razorpayCreateOrder({
    amountPaise,
    receipt: `app_${app.id}`.slice(0, 40),
    notes: {
      applicationId: app.id,
      kind: parsed.data.kind,
      userId: session.sub,
    },
  });

  if (!order.ok) {
    return NextResponse.json({ error: order.error }, { status: 502 });
  }

  await prisma.application.update({
    where: { id: app.id },
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
    kind: parsed.data.kind,
  });
}
