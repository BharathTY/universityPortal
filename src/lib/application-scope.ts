import { Prisma } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { isConsultant, isMaster, isUniversity, ROLES } from "@/lib/roles";

/** Applications whose student (`user`) is visible to this session (same rules as Manage users). */
export function applicationWhereForSession(session: SessionPayload): Prisma.ApplicationWhereInput {
  const userWhere: Prisma.UserWhereInput = {
    roles: { some: { role: { slug: ROLES.student } } },
  };
  if (isConsultant(session.roles) && !isMaster(session.roles) && !isUniversity(session.roles)) {
    userWhere.studentOfId = session.sub;
  } else if (isUniversity(session.roles) && session.universityId) {
    userWhere.universityId = session.universityId;
  }
  return { user: userWhere };
}
