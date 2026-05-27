import {
  canManageSpocs,
  isConsultantOnly,
  isConsultantPrincipal,
  isConsultantSpoc,
  isMaster,
  isStudent,
  isUniversity,
} from "@/lib/roles";

export type NavIconName =
  | "users"
  | "briefcase"
  | "file"
  | "building"
  | "graduation"
  | "home"
  | "calendar"
  | "layers"
  | "userPlus"
  | "creditCard";

export type NavItem = { href: string; label: string; icon: NavIconName };

export type NavGroup = { title: string; items: NavItem[] };

export type BuildDashboardNavOptions = {
  universityId?: string | null;
};

/** PRD §2–§7 sidebar navigation by role. */
export function buildDashboardNav(roles: string[], options?: BuildDashboardNavOptions): NavGroup[] {
  const universityId = options?.universityId ?? null;

  if (isStudent(roles) && !isMaster(roles)) {
    return [
      {
        title: "Student Portal",
        items: [
          { href: "/dashboard/student/application", label: "My Application", icon: "file" },
          { href: "/dashboard/student/fees", label: "Fees & Payment", icon: "creditCard" },
          { href: "/dashboard/student/profile", label: "Profile", icon: "users" },
        ],
      },
    ];
  }

  if (isMaster(roles)) {
    return [
      {
        title: "Master Admin",
        items: [
          { href: "/dashboard/master", label: "Dashboard", icon: "home" },
          { href: "/dashboard/master/universities", label: "Universities", icon: "building" },
          { href: "/dashboard/master/consultants", label: "Consultants", icon: "users" },
          { href: "/dashboard/master/leads", label: "Student Leads", icon: "layers" },
          { href: "/dashboard/master/payments", label: "Payments", icon: "creditCard" },
        ],
      },
    ];
  }

  if (isConsultantSpoc(roles)) {
    return [
      {
        title: "Consultant SPOC",
        items: [
          { href: "/dashboard/spoc", label: "Dashboard", icon: "home" },
          { href: "/dashboard/consultant/leads", label: "Student Leads", icon: "layers" },
          { href: "/dashboard/consultant/assigned-universities", label: "Assigned Universities", icon: "building" },
        ],
      },
    ];
  }

  if (isConsultantPrincipal(roles) && isConsultantOnly(roles)) {
    const items: NavItem[] = [
      { href: "/dashboard/consultant-home", label: "Dashboard", icon: "home" },
      { href: "/dashboard/consultant/leads", label: "Student Leads", icon: "layers" },
      { href: "/dashboard/consultant/assigned-universities", label: "Assigned Universities", icon: "building" },
      { href: "/dashboard/consultant/invoices?status=pending", label: "Pending Payments", icon: "creditCard" },
    ];
    if (canManageSpocs(roles)) {
      items.push({ href: "/dashboard/consultant/spocs", label: "Consultant SPOCs", icon: "userPlus" });
    }
    return [{ title: "Consultant", items }];
  }

  if (isUniversity(roles) && !isMaster(roles)) {
    const groups: NavGroup[] = [
      { title: "Home", items: [{ href: "/dashboard", label: "Dashboard", icon: "home" }] },
    ];
    if (universityId) {
      groups.push({
        title: "Admissions",
        items: [
          {
            href: `/dashboard/university/${universityId}/admissions`,
            label: "Admissions",
            icon: "briefcase",
          },
        ],
      });
    }
    return groups;
  }

  return [{ title: "Home", items: [{ href: "/dashboard", label: "Dashboard", icon: "home" }] }];
}

export function isNavActive(pathname: string, href: string): boolean {
  const pathNorm = pathname.replace(/\/$/, "") || "/";
  const hrefNorm = href.replace(/\/$/, "") || "/";
  const hrefBase = hrefNorm.split("?")[0]!;

  if (hrefBase === "/dashboard/master") {
    return pathNorm === "/dashboard/master";
  }
  if (hrefBase === "/dashboard/consultant-home") {
    return pathNorm === "/dashboard/consultant-home";
  }
  if (hrefBase === "/dashboard/spoc") {
    return pathNorm === "/dashboard/spoc";
  }
  if (hrefBase === "/dashboard/master/universities") {
    return pathNorm === hrefBase || pathNorm.startsWith(`${hrefBase}/`);
  }
  if (hrefBase === "/dashboard/master/consultants") {
    return pathNorm === hrefBase || pathNorm.startsWith(`${hrefBase}/`);
  }
  if (hrefBase === "/dashboard/master/leads") {
    return pathNorm === hrefBase;
  }
  if (hrefBase === "/dashboard/master/payments") {
    return pathNorm === hrefBase;
  }
  if (hrefBase === "/dashboard/consultant/leads") {
    return pathNorm === hrefBase || pathNorm.startsWith(`${hrefBase}/`);
  }
  /** Admissions home: match only .../admissions, not nested paths. */
  if (/\/dashboard\/university\/[^/]+\/admissions$/.test(hrefBase)) {
    return pathNorm === hrefBase;
  }
  if (hrefBase === "/dashboard/consultant/assigned-universities") {
    return pathNorm === hrefBase;
  }
  if (hrefBase === "/dashboard/consultant/spocs") {
    return pathNorm === hrefBase;
  }
  if (hrefBase === "/dashboard/consultant/invoices") {
    return pathNorm === hrefBase;
  }
  if (hrefBase === "/dashboard/student/application") {
    return pathNorm === hrefBase || pathNorm.startsWith(`${hrefBase}/`);
  }
  if (hrefBase === "/dashboard/student/fees") {
    return pathNorm === hrefBase;
  }
  if (hrefBase === "/dashboard/student/profile") {
    return pathNorm === hrefBase;
  }
  if (hrefNorm === "/dashboard") {
    return pathNorm === "/dashboard";
  }
  return pathNorm === hrefBase || pathNorm.startsWith(`${hrefBase}/`);
}
