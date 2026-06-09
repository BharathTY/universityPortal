import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { sendPaymentSuccessEmail } from "@/lib/email";
import { getStudentApplication } from "@/lib/student-application-data";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";
import { recordApplicationPayment } from "@/lib/student-payment";
import { studentPaymentPanelState } from "@/lib/student-portal";

const bodySchema = z.object({
  applicationId: z.string().min(1),
  /** Mock gateway: razorpay | upi | card */
  method: z.enum(["razorpay", "upi", "card"]),
  /** Amount in rupees for partial application fee payment. */
  amountRupees: z.number().positive(),
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

  const panelState = studentPaymentPanelState({
    leadStatus: appData.lead?.admissionStatus ?? null,
    applicationFee: appData.paymentSummary.applicationFee,
    paidRupees: appData.paymentSummary.paidRupees,
    applicationStatus: appData.status,
    paymentStatus: appData.paymentStatus,
  });
  if (panelState !== "ready_to_pay") {
    return NextResponse.json(
      { error: "Payment is not available until your consultant marks the lead as Ready to Pay." },
      { status: 409 },
    );
  }

  if (parsed.data.amountRupees > appData.paymentSummary.remainingDue) {
    return NextResponse.json({ error: "Amount exceeds remaining application fee due" }, { status: 400 });
  }

  const app = await prisma.application.findFirst({
    where: { id: parsed.data.applicationId, userId: session.sub },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  await recordApplicationPayment({
    applicationId: app.id,
    userId: session.sub,
    amountRupees: parsed.data.amountRupees,
    paymentMethod: parsed.data.method,
    leadId: appData.lead?.id ?? null,
    applicationFee: appData.paymentSummary.applicationFee,
    paidBefore: appData.paymentSummary.paidRupees,
  });

  try {
    await sendPaymentSuccessEmail({
      to: session.email,
      name: app.user.name ?? app.user.email,
      amountLabel: `₹${parsed.data.amountRupees.toLocaleString("en-IN")} (${parsed.data.method})`,
      applicationId: app.referenceCode ?? app.id,
    });
  } catch (e) {
    console.error("sendPaymentSuccessEmail", e);
  }

  return NextResponse.json({ ok: true, mock: { charged: parsed.data.amountRupees } });
}
