import { ROLES } from "@/lib/roles";

/** Role slugs from `Role` that may be attributed on an admission lead (subset of portal roles). */
export const ADMISSION_LEAD_ROLE_SLUGS = [ROLES.consultant, ROLES.counsellor] as const;

export type AdmissionLeadRoleSlug = (typeof ADMISSION_LEAD_ROLE_SLUGS)[number];

export function isAdmissionLeadRoleSlug(slug: string): slug is AdmissionLeadRoleSlug {
  return (ADMISSION_LEAD_ROLE_SLUGS as readonly string[]).includes(slug);
}
