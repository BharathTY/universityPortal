import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { sendCounsellorPortalInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly, ROLES } from "@/lib/roles";
import { generateInviteToken, getAppOrigin } from "@/lib/student-invite";

const bodySchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(120).trim(),
  phone: z.string().min(5).max(32).trim(),
  universityIds: z.array(z.string().min(1)).min(1).max(50),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isConsultantOnly(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const allowed = await getAllowedConsultantUniversityIds(session.sub);
  if (allowed.length === 0) {
    return NextResponse.json({ error: "No universities assigned to your account" }, { status: 400 });
  }

  const uniSet = new Set(allowed);
  for (const id of parsed.data.universityIds) {
    if (!uniSet.has(id)) {
      return NextResponse.json({ error: "You can only assign universities linked to your account" }, { status: 400 });
    }
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const counsellorRole = await prisma.role.findUnique({ where: { slug: ROLES.counsellor } });
  if (!counsellorRole) {
    return NextResponse.json({ error: "Counsellor role not configured" }, { status: 500 });
  }

  const inviter = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { name: true, email: true },
  });
  const inviterName =
    inviter?.name?.trim() ||
    inviter?.email?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    "Admission partner";

  const primaryUniversityId = parsed.data.universityIds[0]!;
  const token = generateInviteToken();

  const universities = await prisma.university.findMany({
    where: { id: { in: parsed.data.universityIds } },
    select: { id: true, name: true, code: true },
  });
  const universityLabels = universities.map((u) => `${u.name} (${u.code})`).join(", ");

  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      phone: parsed.data.phone,
      universityId: primaryUniversityId,
      reportsToConsultantId: session.sub,
      inviteToken: token,
      inviteSentAt: new Date(),
      roles: {
        create: { roleId: counsellorRole.id },
      },
      consultantUniversities: {
        create: parsed.data.universityIds.map((universityId) => ({ universityId })),
      },
    },
  });

  const acceptUrl = `${getAppOrigin()}/invite/accept?token=${encodeURIComponent(token)}`;
  try {
    await sendCounsellorPortalInviteEmail({
      to: email,
      acceptUrl,
      inviterName,
      universityLabels,
    });
  } catch (e) {
    console.error("sendCounsellorPortalInviteEmail", e);
  }

  return NextResponse.json({ ok: true });
}
