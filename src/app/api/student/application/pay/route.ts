import { ApplicationPaymentStatus, ApplicationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { sendPaymentSuccessEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";

const bodySchema = z.object({
  applicationId: z.string().min(1),
  /** Mock gateway: razorpay | upi | card */
  method: z.enum(["razorpay", "upi", "card"]),
  /** registration | program */
  step: z.enum(["registration", "program"]),
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

  const registrationFee = 2500;
  const programFee = 50000;

  if (parsed.data.step === "registration") {
    const updated = await prisma.application.update({
      where: { id: app.id },
      data: {
        paymentStatus: ApplicationPaymentStatus.REGISTRATION_PAID,
        status: ApplicationStatus.PROGRAM_FEE_PENDING,
      },
    });
    try {
      await sendPaymentSuccessEmail({
        to: session.email,
        name: app.user.name ?? app.user.email,
        amountLabel: `₹${registrationFee.toLocaleString("en-IN")} (${parsed.data.method})`,
        applicationId: app.id,
      });
    } catch (e) {
      console.error("sendPaymentSuccessEmail", e);
    }
    return NextResponse.json({ ok: true, application: updated, mock: { charged: registrationFee } });
  }

  const updated = await prisma.application.update({
    where: { id: app.id },
    data: {
      paymentStatus: ApplicationPaymentStatus.PROGRAM_PAID,
      status: ApplicationStatus.COMPLETED,
    },
  });
  try {
    await sendPaymentSuccessEmail({
      to: session.email,
      name: app.user.name ?? app.user.email,
      amountLabel: `₹${programFee.toLocaleString("en-IN")} (${parsed.data.method})`,
      applicationId: app.id,
    });
  } catch (e) {
    console.error("sendPaymentSuccessEmail", e);
  }

  return NextResponse.json({ ok: true, application: updated, mock: { charged: programFee } });
}
