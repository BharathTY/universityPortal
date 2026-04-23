import { redirect } from "next/navigation";
import type { SessionPayload } from "@/lib/auth";
import { assertConsultantUniversityMembership } from "@/lib/consultant-universities";
import { isConsultant, isMaster, isUniversity } from "@/lib/roles";

/**
 * Whether the user may access data for `universityId`.
 * Consultants may access any university they are assigned to (join table), not only the active header selection.
 */
export async function canAccessUniversityScopeAsync(
  session: SessionPayload,
  universityId: string,
): Promise<boolean> {
  if (isMaster(session.roles)) return true;
  if (isUniversity(session.roles)) {
    return Boolean(session.universityId && session.universityId === universityId);
  }
  if (isConsultant(session.roles)) {
    return assertConsultantUniversityMembership(session.sub, universityId);
  }
  return false;
}

/** Server components: redirect when access denied. */
export async function assertUniversityScope(session: SessionPayload, universityId: string): Promise<void> {
  if (!(await canAccessUniversityScopeAsync(session, universityId))) {
    redirect("/dashboard");
  }
}
