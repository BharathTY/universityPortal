import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isConsultant, ROLES } from "@/lib/roles";
import { sendStudentInviteEmail } from "@/lib/email";
import { generateInviteToken, getAppOrigin } from "@/lib/student-invite";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(120).optional(),
});

/** Counsellors, consultants, and consultant_master can invite students (same backend rules). */
export async function handleInviteStudentRequest(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isConsultant(session.roles)) {
    return NextResponse.json(
      { error: "Only counsellors and consultants can invite students" },
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
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name?.trim() || null;

  const staff = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, universityId: true, email: true },
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
      universityId: staff.universityId,
      studentOfId: staff.id,
      inviteToken: token,
      inviteSentAt: new Date(),
      roles: {
        create: { roleId: studentRole.id },
      },
    },
  });

  const acceptUrl = `${getAppOrigin()}/invite/accept?token=${encodeURIComponent(token)}`;
  await sendStudentInviteEmail(email, acceptUrl);

  return NextResponse.json({ ok: true });
}
