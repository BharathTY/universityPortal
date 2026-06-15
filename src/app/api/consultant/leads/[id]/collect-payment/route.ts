import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { completeConsultantLeadPayment } from "@/lib/consultant-lead-payment";
import { parseAmountRupees } from "@/lib/payment-amount";
import { prisma } from "@/lib/prisma";
import { isConsultant } from "@/lib/roles";

const bodySchema = z.object({
  amountRupees: z.union([z.number(), z.string()]),
  remarks: z.string().max(500).trim().optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

/** Dev / fallback: record payment without Razorpay when keys are not configured. */
export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session || !isConsultant(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await getAllowedConsultantUniversityIds(session.sub);
  if (allowed.length === 0) {
    return NextResponse.json({ error: "No universities assigned" }, { status: 400 });
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
    return NextResponse.json(
      { error: amountParsed.error, fieldErrors: { amount: [amountParsed.error] } },
      { status: 400 },
    );
  }

  const lead = await prisma.admissionLead.findFirst({
    where: { id: leadId, universityId: { in: allowed }, createdByUserId: session.sub },
    select: { id: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const remarks = parsed.data.remarks?.trim();
  const paymentMethod = ["Simulated payment (dev)", remarks ? `Remarks: ${remarks}` : null]
    .filter(Boolean)
    .join(" · ");

  try {
    const completed = await completeConsultantLeadPayment({
      leadId,
      userId: session.sub,
      roles: session.roles,
      paymentMethod,
      amount: new Prisma.Decimal(amountParsed.value.toFixed(2)),
    });

    if (!completed.ok) {
      return NextResponse.json({ error: completed.error }, { status: completed.status });
    }

    return NextResponse.json(completed.result);
  } catch (e) {
    console.error("collect-payment", e);
    return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
  }
}
