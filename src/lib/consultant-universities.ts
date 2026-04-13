import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isConsultant } from "@/lib/roles";

/** Replaces join rows and sets `User.universityId` to the first assignment (session default). */
export async function replaceConsultantUniversityAssignments(
  userId: string,
  universityIds: string[],
): Promise<void> {
  const unique = [...new Set(universityIds)].filter(Boolean);
  await prisma.$transaction(async (tx) => {
    await tx.consultantUniversity.deleteMany({ where: { userId } });
    if (unique.length > 0) {
      await tx.consultantUniversity.createMany({
        data: unique.map((universityId) => ({ userId, universityId })),
      });
    }
    await tx.user.update({
      where: { id: userId },
      data: { universityId: unique[0] ?? null },
    });
  });
}

/** University IDs a consultant may access (join table + legacy `User.universityId`). */
export async function getAllowedConsultantUniversityIds(userId: string): Promise<string[]> {
  const [rows, user] = await Promise.all([
    prisma.consultantUniversity.findMany({
      where: { userId },
      select: { universityId: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    }),
  ]);
  const set = new Set(rows.map((r) => r.universityId));
  if (user?.universityId) set.add(user.universityId);
  return [...set];
}

/** Active university for API/UI: session value if allowed, else first allowed (stable sort by name). */
export async function resolveConsultantActiveUniversityId(
  session: SessionPayload,
): Promise<{ universityId: string | null }> {
  if (!isConsultant(session.roles)) {
    return { universityId: session.universityId };
  }

  const allowed = await getAllowedConsultantUniversityIds(session.sub);
  if (allowed.length === 0) {
    return { universityId: null };
  }

  if (session.universityId && allowed.includes(session.universityId)) {
    return { universityId: session.universityId };
  }

  const unis = await prisma.university.findMany({
    where: { id: { in: allowed } },
    orderBy: { name: "asc" },
    select: { id: true },
    take: 1,
  });
  return { universityId: unis[0]?.id ?? allowed[0]! };
}

export async function assertConsultantUniversityMembership(
  userId: string,
  universityId: string,
): Promise<boolean> {
  const allowed = await getAllowedConsultantUniversityIds(userId);
  return allowed.includes(universityId);
}

/** JWT `universityId` after login — uses join table + legacy column for consultants. */
export async function initialSessionUniversityIdForUser(user: {
  id: string;
  universityId: string | null;
  studentOfId: string | null;
  roles: { role: { slug: string } }[];
}): Promise<string | null> {
  const roles = user.roles.map((r) => r.role.slug);
  const sessionLike: SessionPayload = {
    sub: user.id,
    email: "",
    roles,
    universityId: user.universityId,
    studentOfId: user.studentOfId ?? null,
  };
  const { universityId } = await resolveConsultantActiveUniversityId(sessionLike);
  return universityId;
}
