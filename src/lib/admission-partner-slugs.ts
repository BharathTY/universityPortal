import { ROLES } from "@/lib/roles";

/** Roles shown on the master consultant listing (primary partners only — not SPOC sub-users). */
export const CONSULTANT_LIST_ROLE_SLUGS = [
  ROLES.consultant,
  ROLES.consultantMaster,
  ROLES.qspidersBranch,
] as const;

/** Roles counted as admission partners / consultants per PRD. */
export const ADMISSION_PARTNER_ROLE_SLUGS = [
  ROLES.consultant,
  ROLES.consultantSpoc,
  ROLES.counsellor,
  ROLES.consultantMaster,
  ROLES.qspidersBranch,
] as const;
