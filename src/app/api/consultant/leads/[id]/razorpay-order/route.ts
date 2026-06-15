import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { parseAmountRupees } from "@/lib/payment-amount";
import {
  isRazorpaySplitEnabled,
  resolveUniversityRazorpayLinkedAccountId,
  splitPaymentPaise,
  splitPaymentRupees,
  getPaymentSplitConfig,
} from "@/lib/payment-split";
import { prisma } from "@/lib/prisma";
import {
  getRazorpayKeyIdPublic,
  isRazorpayConfigured,
  razorpayCreateOrder,
} from "@/lib/razorpay-server";
import { isConsultant } from "@/lib/roles";

const bodySchema = z.object({
  amountRupees: z.union([z.number(), z.string()]),
  remarks: z.string().max(500).trim().optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

async function loadOwnedLead(leadId: string, userId: string) {
  const allowed = await getAllowedConsultantUniversityIds(userId);
  if (allowed.length === 0) return null;
  return prisma.admissionLead.findFirst({
    where: { id: leadId, universityId: { in: allowed }, createdByUserId: userId },
    select: {
      id: true,
      admissionStatus: true,
      universityId: true,
      university: { select: { razorpayLinkedAccountId: true } },
    },
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session || !isConsultant(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
      { status: 503 },
    );
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
    return NextResponse.json({ error: amountParsed.error, fieldErrors: { amount: [amountParsed.error] } }, { status: 400 });
  }

  const lead = await loadOwnedLead(leadId, session.sub);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.admissionStatus !== "READY_TO_PAY") {
    return NextResponse.json({ error: "Lead must be in Ready to Pay status" }, { status: 409 });
  }

  const amountPaise = Math.round(amountParsed.value * 100);
  if (amountPaise < 100) {
    return NextResponse.json({ error: "Minimum amount is ₹1" }, { status: 400 });
  }

  let transfers: { account: string; amount: number; currency: string }[] | undefined;
  if (isRazorpaySplitEnabled()) {
    const linkedAccount = resolveUniversityRazorpayLinkedAccountId(lead.university.razorpayLinkedAccountId);
    if (linkedAccount) {
      const { universitySharePaise } = splitPaymentPaise(amountPaise);
      if (universitySharePaise >= 100) {
        transfers = [{ account: linkedAccount, amount: universitySharePaise, currency: "INR" }];
      }
    }
  }

  const order = await razorpayCreateOrder({
    amountPaise,
    receipt: `lead_${leadId}`.slice(0, 40),
    notes: {
      leadId,
      kind: "consultant_lead",
      consultantUserId: session.sub,
      remarks: parsed.data.remarks?.trim() || "",
    },
    transfers,
  });

  if (!order.ok) {
    return NextResponse.json({ error: order.error }, { status: 502 });
  }

  const amount = new Prisma.Decimal(amountParsed.value.toFixed(2));

  await prisma.$transaction(async (tx) => {
    const pending = await tx.leadPayment.findFirst({
      where: { leadId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (pending) {
      await tx.leadPayment.update({
        where: { id: pending.id },
        data: { amount },
      });
    }
    await tx.admissionLead.update({
      where: { id: leadId },
      data: { lastRazorpayOrderId: order.orderId },
    });
  });

  const keyId = getRazorpayKeyIdPublic();
  if (!keyId) {
    return NextResponse.json({ error: "RAZORPAY_KEY_ID is not set" }, { status: 500 });
  }

  const split = splitPaymentRupees(amountParsed.value);
  const splitConfig = getPaymentSplitConfig();

  return NextResponse.json({
    orderId: order.orderId,
    amount: order.amount,
    currency: order.currency,
    keyId,
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
