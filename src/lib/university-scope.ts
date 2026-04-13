import { redirect } from "next/navigation";
import type { SessionPayload } from "@/lib/auth";
import { isConsultant, isMaster, isUniversity } from "@/lib/roles";

/** University staff and linked consultants may only access their org; master may access any university by id. */
export function canAccessUniversityScope(session: SessionPayload, universityId: string): boolean {
  if (isMaster(session.roles)) return true;
  if (isUniversity(session.roles)) {
    return Boolean(session.universityId && session.universityId === universityId);
  }
  if (isConsultant(session.roles) && !isUniversity(session.roles)) {
    return Boolean(session.universityId && session.universityId === universityId);
  }
  return false;
}

/** Server components: redirect when access denied. */
export function assertUniversityScope(session: SessionPayload, universityId: string): void {
  if (!canAccessUniversityScope(session, universityId)) {
    redirect("/dashboard");
  }
}
