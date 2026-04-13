import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isConsultant, isMaster, isUniversity, ROLES } from "@/lib/roles";

type StudentAccessFields = {
  studentOfId: string | null;
  universityId: string | null;
};

/** Mirrors filtering on `/dashboard/consultant/students` so row actions stay in sync. */
export function canManageStudentRecord(session: SessionPayload, student: StudentAccessFields): boolean {
  if (isMaster(session.roles)) return true;
  if (isConsultant(session.roles) && !isMaster(session.roles) && !isUniversity(session.roles)) {
    return student.studentOfId === session.sub;
  }
  if (isUniversity(session.roles) && session.universityId) {
    return student.universityId === session.universityId;
  }
  return false;
}

export async function getManagedStudentOrNull(userId: string, session: SessionPayload) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      roles: { some: { role: { slug: ROLES.student } } },
    },
    select: {
      id: true,
      email: true,
      name: true,
      inviteToken: true,
      inviteAcceptedAt: true,
      inviteSentAt: true,
      universityId: true,
      studentOfId: true,
      university: { select: { name: true, code: true } },
      studentOf: { select: { email: true, name: true } },
      roles: { select: { role: { select: { slug: true, name: true } } } },
    },
  });
  if (!user) return null;
  if (!canManageStudentRecord(session, user)) return null;
  return user;
}
