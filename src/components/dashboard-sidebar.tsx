"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  buildDashboardNav,
  isNavActive,
  type NavIconName,
} from "@/components/dashboard-nav-config";
import { PortalLogoSvg } from "@/components/portal-logo";

type DashboardSidebarProps = {
  onNavigate?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  roles: string[];
  universityId: string | null;
  /** Sidebar title (e.g. Student Portal for students). */
  brandTitle?: string;
  brandSubtitle?: string;
};

export function DashboardSidebar({
  onNavigate,
  collapsed,
  onToggleCollapse,
  roles,
  universityId,
  brandTitle = "University Portal",
  brandSubtitle = "portal.ams",
}: DashboardSidebarProps) {
  const pathname = usePathname() ?? "";
  const groups = buildDashboardNav(roles, { universityId });

  return (
    <aside className="flex h-full flex-col px-2 pb-6 pt-4 md:px-3 md:pt-6">
      <div
        className={`mb-4 flex w-full gap-2 ${collapsed ? "flex-col items-center gap-3" : "items-start justify-between"}`}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={`group flex min-w-0 items-center gap-2.5 rounded-xl p-1.5 -m-1.5 transition-all duration-200 ease-out hover:bg-[var(--muted)]/80 focus-visible:bg-[var(--muted)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 active:scale-[0.98] md:hover:shadow-sm ${
            collapsed ? "flex-col justify-center" : "flex-1"
          }`}
          title="Go to dashboard"
        >
          <span
            className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-white shadow-md ring-2 ring-amber-400/25 transition-all duration-200 ease-out group-hover:scale-105 group-hover:shadow-lg group-hover:ring-amber-400/45 group-active:scale-95 dark:from-amber-500 dark:via-amber-600 dark:to-orange-700"
            aria-hidden
          >
            <PortalLogoSvg className="h-6 w-6 drop-shadow-sm" />
          </span>
          {!collapsed ? (
            <div className="min-w-0 leading-tight transition-colors group-hover:text-[var(--foreground)]">
              <p className="text-sm font-bold tracking-tight text-[var(--foreground)]">{brandTitle}</p>
              <p className="text-xs text-[var(--foreground-muted)] group-hover:text-[var(--foreground-muted)]/90">
                {brandSubtitle}
              </p>
            </div>
          ) : (
            <span className="sr-only">{brandTitle}</span>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 text-[var(--foreground-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] md:inline-flex"
          aria-expanded={!collapsed}
          aria-controls="dashboard-main-nav"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      <nav id="dashboard-main-nav" className="flex flex-col gap-5" aria-label="Main">
        {groups.map((group, gi) => (
          <div key={`${group.title}-${gi}`}>
            <p
              className={`mb-2 px-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] ${
                collapsed ? "sr-only" : ""
              }`}
            >
              {group.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center rounded-lg py-2 text-sm font-medium transition ${
                        collapsed ? "justify-center px-2" : "gap-2.5 px-2.5"
                      } ${
                        active
                          ? "bg-[var(--sidebar-active)] text-white shadow-sm"
                          : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                      }`}
                    >
                      <NavIcon name={item.icon} active={active} />
                      <span className={collapsed ? "sr-only" : ""}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavIcon({ name, active }: { name: NavIconName; active: boolean }) {
  const cls = `h-[1.15rem] w-[1.15rem] shrink-0 ${active ? "text-white" : "text-[var(--foreground-muted)]"}`;
  switch (name) {
    case "home":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "building":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "graduation":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M22 10v6M12 3L2 10l10 7 10-7-10-7zM6 12v5c0 2 3 3 6 3s6-1 6-3v-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "users":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path
            d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "briefcase":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M2 13h20" strokeLinecap="round" />
        </svg>
      );
    case "file":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
        </svg>
      );
    case "layers":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "userPlus":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 7a4 4 0 108 0 4 4 0 00-8 0zM20 8v6M23 11h-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}
