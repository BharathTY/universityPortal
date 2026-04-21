import {
  isConsultantOnly,
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
  | "userPlus";

export type NavItem = { href: string; label: string; icon: NavIconName };

export type NavGroup = { title: string; items: NavItem[] };

export type BuildDashboardNavOptions = {
  universityId?: string | null;
};

/** Build sidebar navigation from JWT roles (OTP login). */
export function buildDashboardNav(roles: string[], options?: BuildDashboardNavOptions): NavGroup[] {
  const universityId = options?.universityId ?? null;
  if (isStudent(roles) && !isMaster(roles)) {
    return [
      {
        title: "Dashboard",
        items: [
          { href: "/dashboard", label: "Overview", icon: "home" },
          { href: "/dashboard/student/application", label: "Application", icon: "file" },
        ],
      },
    ];
  }

  if (isMaster(roles)) {
    return [
      {
        title: "Master admin",
        items: [
          { href: "/dashboard", label: "Dashboard", icon: "home" },
          { href: "/dashboard/master/universities", label: "Universities", icon: "building" },
          { href: "/dashboard/master/consultants", label: "Admission partners", icon: "users" },
          { href: "/dashboard/master/applications", label: "Applications", icon: "file" },
        ],
      },
    ];
  }

  if (isConsultantOnly(roles)) {
    return [
      { title: "Home", items: [{ href: "/dashboard/consultant", label: "Dashboard", icon: "home" }] },
      {
        title: "Work",
        items: [
          { href: "/dashboard/batches", label: "Universities", icon: "layers" },
        ],
      },
      {
        title: "Users",
        items: [{ href: "/dashboard/consultant/students", label: "Manage users", icon: "users" }],
      },
    ];
  }

  const groups: NavGroup[] = [];

  if (isUniversity(roles) && !isMaster(roles)) {
    groups.push({
      title: "Home",
      items: [{ href: "/dashboard", label: "Dashboard", icon: "home" }],
    });
    if (universityId) {
      groups.push({
        title: "Admissions",
        items: [
          {
            href: `/dashboard/university/${universityId}/admissions`,
            label: "Admissions",
            icon: "briefcase",
          },
          {
            href: `/dashboard/university/${universityId}/applications`,
            label: "Applications",
            icon: "file",
          },
          {
            href: `/dashboard/university/${universityId}/admissions/academic-years`,
            label: "Academic years",
            icon: "calendar",
          },
          {
            href: `/dashboard/university/${universityId}/admissions/streams`,
            label: "Streams",
            icon: "layers",
          },
          {
            href: `/dashboard/university/${universityId}/admissions/leads/new`,
            label: "Add lead",
            icon: "userPlus",
          },
        ],
      });
      groups.push({
        title: "Uni-Admission",
        items: [
          {
            href: `/dashboard/university/${universityId}/uni-admissions`,
            label: "Admission (Uni-Admission)",
            icon: "graduation",
          },
        ],
      });
    }
    return groups;
  }

  if (groups.length === 0) {
    groups.push({
      title: "Home",
      items: [{ href: "/dashboard", label: "Dashboard", icon: "home" }],
    });
  }

  return groups;
}

export function isNavActive(pathname: string, href: string): boolean {
  const pathNorm = pathname.replace(/\/$/, "") || "/";
  const hrefNorm = href.replace(/\/$/, "") || "/";

  if (hrefNorm === "/dashboard/batches") {
    return pathNorm === "/dashboard/batches" || pathNorm.startsWith("/dashboard/batches/");
  }
  if (hrefNorm === "/dashboard/university") {
    return pathNorm === "/dashboard/university" || pathNorm.startsWith("/dashboard/university/");
  }
  /** Admissions home: match only .../admissions, not .../admissions/academic-years etc. */
  if (/\/dashboard\/university\/[^/]+\/admissions$/.test(hrefNorm)) {
    return pathNorm === hrefNorm;
  }
  /** Uni-Admission list: match only .../uni-admissions */
  if (/\/dashboard\/university\/[^/]+\/uni-admissions$/.test(hrefNorm)) {
    return pathNorm === hrefNorm;
  }
  if (/\/dashboard\/university\/[^/]+\/applications$/.test(hrefNorm)) {
    return pathNorm === hrefNorm;
  }
  if (hrefNorm === "/dashboard/master/universities") {
    return pathNorm === "/dashboard/master/universities" || pathNorm.startsWith("/dashboard/master/universities/");
  }
  if (hrefNorm === "/dashboard/master/consultants") {
    return pathNorm === "/dashboard/master/consultants" || pathNorm.startsWith("/dashboard/master/consultants/");
  }
  if (hrefNorm === "/dashboard/master/applications") {
    return pathNorm === "/dashboard/master/applications";
  }
  if (hrefNorm === "/dashboard/consultant") {
    return pathNorm === "/dashboard/consultant" || pathNorm.startsWith("/dashboard/consultant/");
  }
  if (hrefNorm === "/dashboard/master") {
    return pathNorm === "/dashboard/master" || pathNorm.startsWith("/dashboard/master/");
  }
  if (hrefNorm === "/dashboard/student") {
    return pathNorm === "/dashboard/student";
  }
  if (hrefNorm === "/dashboard/student/application") {
    return pathNorm === "/dashboard/student/application" || pathNorm.startsWith("/dashboard/student/application/");
  }
  if (hrefNorm === "/dashboard") {
    return pathNorm === "/dashboard";
  }
  return pathNorm === hrefNorm || pathNorm.startsWith(`${hrefNorm}/`);
}
