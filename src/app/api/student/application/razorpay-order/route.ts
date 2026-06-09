import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getStudentApplication } from "@/lib/student-application-data";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";
import { getRazorpayKeyIdPublic, isRazorpayConfigured, razorpayCreateOrder } from "@/lib/razorpay-server";
import {
  isRazorpaySplitEnabled,
  resolveUniversityRazorpayLinkedAccountId,
  splitPaymentPaise,
  splitPaymentRupees,
  getPaymentSplitConfig,
} from "@/lib/payment-split";
import { studentPaymentPanelState } from "@/lib/student-portal";
import { requireActiveUniversity } from "@/lib/require-active-university";

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

  const universityId = appData.university?.id;
  if (universityId) {
    const activeGate = await requireActiveUniversity(universityId);
    if (!activeGate.ok) return activeGate.response;
  }

  const { paymentSummary, lead } = appData;
  const panelState = studentPaymentPanelState({
    leadStatus: lead?.admissionStatus ?? null,
    applicationFee: paymentSummary.applicationFee,
    paidRupees: paymentSummary.paidRupees,
    applicationStatus: appData.status,
    paymentStatus: appData.paymentStatus,
  });

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

  let transfers: { account: string; amount: number; currency: string }[] | undefined;
  if (isRazorpaySplitEnabled() && universityId) {
    const uni = await prisma.university.findUnique({
      where: { id: universityId },
      select: { razorpayLinkedAccountId: true },
    });
    const linkedAccount = resolveUniversityRazorpayLinkedAccountId(uni?.razorpayLinkedAccountId);
    if (linkedAccount) {
      const { universitySharePaise } = splitPaymentPaise(parsed.data.amountPaise);
      if (universitySharePaise >= 100) {
        transfers = [{ account: linkedAccount, amount: universitySharePaise, currency: "INR" }];
      }
    }
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
    transfers,
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

  const split = splitPaymentRupees(parsed.data.amountPaise / 100);
  const splitConfig = getPaymentSplitConfig();

  return NextResponse.json({
    orderId: order.orderId,
    amount: order.amount,
    currency: order.currency,
    keyId,
    kind: "application",
    split: {
      universityPercent: split.universityPercent,
      platformPercent: split.platformPercent,
      platformLabel: splitConfig.platformLabel,
      universityShareRupees: split.universityShareRupees,
      platformShareRupees: split.platformShareRupees,
      razorpayRouteTransfer: Boolean(transfers?.length),
    },
  });
}
