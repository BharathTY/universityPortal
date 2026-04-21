import { ROLES } from "@/lib/roles";

/** Roles counted as admission partners (consultant, legacy slugs, branch). */
export const ADMISSION_PARTNER_ROLE_SLUGS = [
  ROLES.consultant,
  ROLES.counsellor,
  ROLES.consultantMaster,
  ROLES.qspidersBranch,
] as const;
