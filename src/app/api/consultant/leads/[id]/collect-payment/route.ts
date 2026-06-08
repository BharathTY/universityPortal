import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { completeConsultantLeadPayment } from "@/lib/consultant-lead-payment";
import { prisma } from "@/lib/prisma";
import { isConsultant } from "@/lib/roles";

const bodySchema = z.object({
  paymentMethod: z.enum(["UPI", "CASH"]),
  upiId: z.string().max(120).trim().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

function paymentMethodLabel(data: z.infer<typeof bodySchema>): string {
  if (data.paymentMethod === "UPI") {
    return data.upiId ? `Student paid university UPI (${data.upiId})` : "Student paid university UPI";
  }
  return "Student paid (cash)";
}

export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isConsultant(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const lead = await prisma.admissionLead.findFirst({
    where: {
      id: leadId,
      universityId: { in: allowed },
      createdByUserId: session.sub,
    },
    select: { id: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  try {
    const completed = await completeConsultantLeadPayment({
      leadId,
      userId: session.sub,
      roles: session.roles,
      paymentMethod: paymentMethodLabel(parsed.data),
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
