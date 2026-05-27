/** Role slugs stored in DB and JWT — PRD §2 four-role model + legacy aliases. */
export const ROLES = {
  student: "student",
  /** PRD: Consultant */
  consultant: "consultant",
  /** PRD: Consultant SPOC (sub-user under consultant) */
  consultantSpoc: "consultant_spoc",
  /** PRD: Master Admin */
  master: "master",
  /** Legacy — treated as Master Admin */
  admin: "admin",
  /** Legacy university staff — admissions back-office */
  university: "university",
  /** @deprecated alias for consultant_spoc */
  counsellor: "counsellor",
  /** @deprecated manager under consultant */
  consultantMaster: "consultant_master",
  /** Legacy branch partner */
  qspidersBranch: "qspiders_branch",
} as const;

export type RoleSlug = (typeof ROLES)[keyof typeof ROLES];

const SPOC_SLUGS = new Set<string>([ROLES.consultantSpoc, ROLES.counsellor]);
const CONSULTANT_SLUGS = new Set<string>([
  ROLES.consultant,
  ROLES.consultantMaster,
  ROLES.qspidersBranch,
]);

export function isMaster(roles: string[]): boolean {
  return roles.includes(ROLES.master) || roles.includes(ROLES.admin);
}

export function isUniversity(roles: string[]): boolean {
  return roles.includes(ROLES.university);
}

/** PRD Consultant (primary admission partner, not SPOC-only). */
export function isConsultantPrincipal(roles: string[]): boolean {
  return (
    roles.includes(ROLES.consultant) ||
    roles.includes(ROLES.consultantMaster) ||
    roles.includes(ROLES.qspidersBranch)
  );
}

/** PRD Consultant SPOC — sub-user with lead management, no SPOC tab. */
export function isConsultantSpoc(roles: string[]): boolean {
  return (
    (roles.includes(ROLES.consultantSpoc) || roles.includes(ROLES.counsellor)) &&
    !isConsultantPrincipal(roles)
  );
}

/** Any consultant-side role (principal or SPOC). */
export function isConsultant(roles: string[]): boolean {
  return isConsultantPrincipal(roles) || isConsultantSpoc(roles);
}

export function isCounsellor(roles: string[]): boolean {
  return roles.includes(ROLES.counsellor) || roles.includes(ROLES.consultantSpoc);
}

export function isCounsellorOnly(roles: string[]): boolean {
  return isConsultantSpoc(roles);
}

export function isConsultantOnly(roles: string[]): boolean {
  return isConsultant(roles) && !isMaster(roles) && !isUniversity(roles);
}

export function isStudent(roles: string[]): boolean {
  return roles.includes(ROLES.student);
}

export function canManageSpocs(roles: string[]): boolean {
  return isConsultantPrincipal(roles) && !isConsultantSpoc(roles);
}

export function canSeeMouPanel(roles: string[]): boolean {
  return isConsultantPrincipal(roles);
}

export function canSeeAdmissionLeadAssignedPartnerName(roles: string[]): boolean {
  return (
    roles.includes(ROLES.admin) ||
    roles.includes(ROLES.master) ||
    isCounsellor(roles) ||
    roles.includes(ROLES.consultantMaster)
  );
}

export function canAccessLeadsAndBatches(roles: string[]): boolean {
  return isMaster(roles) || isUniversity(roles) || isConsultant(roles);
}

/** Post-login redirect per PRD §3. */
export function defaultDashboardPath(roles: string[]): string {
  if (isMaster(roles)) return "/dashboard/master";
  if (isConsultantSpoc(roles)) return "/dashboard/spoc";
  if (isConsultantPrincipal(roles)) return "/dashboard/consultant-home";
  if (isStudent(roles)) return "/dashboard/student/application";
  if (isUniversity(roles)) return "/dashboard";
  return "/dashboard";
}

export function formatRoleLabel(slug: string): string {
  switch (slug) {
    case ROLES.master:
    case ROLES.admin:
      return "Master Admin";
    case ROLES.consultant:
      return "Consultant";
    case ROLES.consultantSpoc:
    case ROLES.counsellor:
      return "Consultant SPOC";
    case ROLES.consultantMaster:
      return "Manager";
    case ROLES.qspidersBranch:
      return "Branch Partner";
    case ROLES.student:
      return "Student";
    case ROLES.university:
      return "University Staff";
    default:
      return slug
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
  }
}

export function formatTeamMemberRole(slug: string): string {
  return formatRoleLabel(slug);
}
