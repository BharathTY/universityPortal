import { ROLES } from "@/lib/roles";

/** Roles counted as admission partners / consultants per PRD. */
export const ADMISSION_PARTNER_ROLE_SLUGS = [
  ROLES.consultant,
  ROLES.consultantSpoc,
  ROLES.counsellor,
  ROLES.consultantMaster,
  ROLES.qspidersBranch,
] as const;
