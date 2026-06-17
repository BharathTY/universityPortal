"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  buildDashboardNav,
  isNavActive,
  type NavIconName,
} from "@/components/dashboard-nav-config";
import { PortalLogoSvg, PORTAL_BRAND_NAME, PORTAL_BRAND_TAGLINE } from "@/components/portal-logo";

type DashboardSidebarProps = {
  onNavigate?: () => void;
  onCloseMobile?: () => void;
  mobileOpen?: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  roles: string[];
  universityId: string | null;
  brandTitle?: string;
  brandSubtitle?: string;
};

export function DashboardSidebar({
  onNavigate,
  onCloseMobile,
  mobileOpen,
  collapsed,
  onToggleCollapse,
  roles,
  universityId,
  brandTitle = PORTAL_BRAND_NAME,
  brandSubtitle = PORTAL_BRAND_TAGLINE,
}: DashboardSidebarProps) {
  const pathname = usePathname() ?? "";
  const groups = buildDashboardNav(roles, { universityId });

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Brand strip — single source of truth for portal identity */}
      <div
        className={`relative shrink-0 bg-[var(--navy-900)] ${
          collapsed ? "px-2 py-3" : "px-4 py-4"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--navy-900)] via-[var(--navy-800)] to-[var(--navy-900)]"
          aria-hidden
        />
        <div
          className={`relative flex items-center gap-2 ${collapsed ? "flex-col" : "justify-between"}`}
        >
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className={`group flex min-w-0 items-center rounded-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 ${
              collapsed ? "flex-col gap-1.5 p-1" : "flex-1 gap-3 p-1"
            }`}
            title="Go to dashboard"
          >
            <span
              className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg brand-logo-gradient text-white shadow-md ring-1 ring-white/20"
              aria-hidden
            >
              <PortalLogoSvg className="h-5 w-5 drop-shadow-sm" />
            </span>
            {!collapsed ? (
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-bold tracking-tight text-white">{brandTitle}</p>
                <p className="truncate text-[0.7rem] text-slate-400">{brandSubtitle}</p>
              </div>
            ) : (
              <span className="sr-only">{brandTitle}</span>
            )}
          </Link>

          <div className={`flex shrink-0 items-center gap-1 ${collapsed ? "flex-col" : ""}`}>
            {mobileOpen ? (
              <button
                type="button"
                onClick={onCloseMobile}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white md:hidden"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white md:inline-flex"
              aria-expanded={!collapsed}
              aria-controls="dashboard-main-nav"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        id="dashboard-main-nav"
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-4 md:px-3"
        aria-label="Main"
      >
        {groups.map((group, gi) => (
          <div key={`${group.title}-${gi}`}>
            <p
              className={`mb-1.5 px-2.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--foreground-muted)] ${
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

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
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
    case "creditCard":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
