import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isConsultant, isCounsellorOnly, ROLES } from "@/lib/roles";
import { sendStudentInviteEmail } from "@/lib/email";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { generateInviteToken } from "@/lib/student-invite";

const bodySchema = z.object({
  email: z.string().email(),
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(120),
  mobile: z
    .string()
    .trim()
    .superRefine((s, ctx) => {
      if (s.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mobile number is required" });
        return;
      }
      if (!/^\d+$/.test(s)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only numbers are allowed" });
        return;
      }
      if (s.length !== 10) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mobile number must be 10 digits" });
      }
    }),
});

/** Counsellors, consultants, and consultant_master can invite students (same backend rules). */
export async function handleInviteStudentRequest(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isConsultant(session.roles) || isCounsellorOnly(session.roles)) {
    return NextResponse.json(
      { error: "Only admission partners can invite students" },
      { status: 403 },
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
    const flat = parsed.error.flatten();
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input", fieldErrors: flat.fieldErrors },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name.trim();
  const mobile = parsed.data.mobile.trim();

  const staff = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, universityId: true, email: true, name: true, branchName: true },
  });

  if (!staff?.universityId) {
    return NextResponse.json(
      {
        error:
          "Your account must be linked to a university before inviting students. Ask a master admin to update your profile.",
      },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const studentRole = await prisma.role.findUnique({ where: { slug: ROLES.student } });
  if (!studentRole) {
    return NextResponse.json({ error: "Student role not configured" }, { status: 500 });
  }

  const token = generateInviteToken();

  await prisma.user.create({
    data: {
      email,
      name,
      phone: mobile,
      universityId: staff.universityId,
      studentOfId: staff.id,
      inviteToken: token,
      inviteSentAt: new Date(),
      roles: {
        create: { roleId: studentRole.id },
      },
    },
  });

  const acceptUrl = `${getPublicAppOrigin()}/invite/accept?token=${encodeURIComponent(token)}`;
  const partnerName =
    staff.name?.trim() ||
    staff.email
      .split("@")[0]
      ?.replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "Admission partner";
  await sendStudentInviteEmail(email, acceptUrl, {
    partnerName,
    branchName: staff.branchName?.trim() || undefined,
  });

  return NextResponse.json({ ok: true });
}
