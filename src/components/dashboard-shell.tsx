"use client";

import * as React from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

const STORAGE_KEY = "sidebar-collapsed";

type DashboardShellProps = {
  children: React.ReactNode;
  roles: string[];
  universityId: string | null;
  brandTitle?: string;
  brandSubtitle?: string;
};

export function DashboardShell({
  children,
  roles,
  universityId,
  brandTitle,
  brandSubtitle,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed, hydrated]);

  const sidebarExpandedVisual = mobileOpen || !collapsed;

  return (
    <div className="relative flex min-h-0 flex-1">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-[4.75rem] z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <PanelIcon />
      </button>

      <div
        className={`fixed inset-y-0 left-0 z-50 shrink-0 border-r border-[var(--border)] bg-[var(--sidebar-bg)] transition-[transform,width] duration-200 ease-out md:static md:z-0 ${
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full md:translate-x-0"
        } w-[min(18rem,100vw-3rem)] ${sidebarExpandedVisual ? "md:w-64" : "md:w-16"} `}
      >
        <div className="flex h-full max-h-[calc(100vh-0px)] flex-col overflow-x-hidden overflow-y-auto pt-14 md:pt-0">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="mb-2 flex items-center justify-end px-3 pt-2 text-sm text-[var(--foreground-muted)] md:hidden"
          >
            Close
          </button>
          <DashboardSidebar
            roles={roles}
            universityId={universityId}
            brandTitle={brandTitle}
            brandSubtitle={brandSubtitle}
            collapsed={!sidebarExpandedVisual}
            onToggleCollapse={() => setCollapsed((c) => !c)}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="min-w-0 flex-1 overflow-y-auto pt-12 md:pt-0">{children}</div>
    </div>
  );
}

function PanelIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" strokeLinecap="round" />
    </svg>
  );
}
