/** Role slugs stored in DB and JWT */
export const ROLES = {
  student: "student",
  consultant: "consultant",
  university: "university",
  master: "master",
  admin: "admin",
  /** @deprecated use consultant */
  counsellor: "counsellor",
  /** @deprecated use consultant */
  consultantMaster: "consultant_master",
} as const;

export type RoleSlug = (typeof ROLES)[keyof typeof ROLES];

export function isMaster(roles: string[]): boolean {
  return roles.includes(ROLES.master) || roles.includes(ROLES.admin);
}

export function isUniversity(roles: string[]): boolean {
  return roles.includes(ROLES.university);
}

/** Counsellor, consultant, or consultant_master (lead/student workflows). */
export function isConsultant(roles: string[]): boolean {
  return (
    roles.includes(ROLES.consultant) ||
    roles.includes(ROLES.counsellor) ||
    roles.includes(ROLES.consultantMaster)
  );
}

export function isCounsellor(roles: string[]): boolean {
  return roles.includes(ROLES.counsellor);
}

/** Consultant / counsellor / consultant_master without Master or University staff roles (student-mentor workflows only). */
export function isConsultantOnly(roles: string[]): boolean {
  return isConsultant(roles) && !isMaster(roles) && !isUniversity(roles);
}

export function isStudent(roles: string[]): boolean {
  return roles.includes(ROLES.student);
}

/** Consultants & university staff & master can open lead/batch tools */
export function canAccessLeadsAndBatches(roles: string[]): boolean {
  return isMaster(roles) || isUniversity(roles) || isConsultant(roles);
}

export function formatRoleLabel(slug: string): string {
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

