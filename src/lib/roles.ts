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
  /** Qspiders branch login — same portal as consultant; branch name on leads. */
  qspidersBranch: "qspiders_branch",
} as const;

export type RoleSlug = (typeof ROLES)[keyof typeof ROLES];

export function isMaster(roles: string[]): boolean {
  return roles.includes(ROLES.master) || roles.includes(ROLES.admin);
}

export function isUniversity(roles: string[]): boolean {
  return roles.includes(ROLES.university);
}

/** Counsellor, consultant, consultant_master, or Qspiders branch (lead/student workflows). */
export function isConsultant(roles: string[]): boolean {
  return (
    roles.includes(ROLES.consultant) ||
    roles.includes(ROLES.counsellor) ||
    roles.includes(ROLES.consultantMaster) ||
    roles.includes(ROLES.qspidersBranch)
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

/**
 * Whether internal UIs may show the assigned admission partner name on a lead
 * (Lead Punch snapshot). Never use for student-facing APIs or pages.
 * Intended for Manager (`consultant_master`), `admin`, `counsellor`, and `master` oversight.
 */
export function canSeeAdmissionLeadAssignedPartnerName(roles: string[]): boolean {
  return (
    roles.includes(ROLES.admin) ||
    roles.includes(ROLES.master) ||
    roles.includes(ROLES.counsellor) ||
    roles.includes(ROLES.consultantMaster)
  );
}

/** Consultants & university staff & master can open lead/batch tools */
export function canAccessLeadsAndBatches(roles: string[]): boolean {
  return isMaster(roles) || isUniversity(roles) || isConsultant(roles);
}

const ADMISSION_PARTNER_SLUGS = new Set<string>([
  ROLES.consultant,
  ROLES.counsellor,
  ROLES.consultantMaster,
  ROLES.qspidersBranch,
]);

/** User-facing role line in headers and dashboards. */
export function formatRoleLabel(slug: string): string {
  if (ADMISSION_PARTNER_SLUGS.has(slug)) {
    return "Admission Partner";
  }
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Distinct labels on the consultant Manage users → Team roster (not collapsed to "Admission Partner"). */
export function formatTeamMemberRole(slug: string): string {
  switch (slug) {
    case ROLES.counsellor:
      return "Counsellor";
    case ROLES.consultantMaster:
      return "Manager";
    case ROLES.qspidersBranch:
      return "Branch";
    case ROLES.consultant:
      return "Admission partner";
    default:
      return formatRoleLabel(slug);
  }
}

