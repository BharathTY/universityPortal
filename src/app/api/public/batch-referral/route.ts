import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdmissionLeadFromBrochureToken } from "@/lib/brochure-referral-lead";

const bodySchema = z.object({
  token: z.string().min(10).max(128),
  firstName: z.string().min(1).max(120).trim(),
  lastName: z.string().min(1).max(120).trim(),
  email: z.string().email().max(254).trim(),
  mobile: z.string().min(5).max(32).trim(),
  referralFirstName: z.string().max(120).trim().optional().nullable(),
  referralLastName: z.string().max(120).trim().optional().nullable(),
  referralPhone: z.string().max(32).trim().optional().nullable(),
  referralEmail: z.string().max(254).trim().optional().nullable(),
  /** Honeypot — bots often fill hidden fields */
  website: z.string().optional(),
});

export async function POST(req: Request) {
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
  if (parsed.data.website?.trim()) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const result = await createAdmissionLeadFromBrochureToken(parsed.data.token, {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    mobile: parsed.data.mobile,
    referralFirstName: parsed.data.referralFirstName,
    referralLastName: parsed.data.referralLastName,
    referralPhone: parsed.data.referralPhone,
    referralEmail: parsed.data.referralEmail,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, leadId: result.leadId }, { status: 201 });
}
