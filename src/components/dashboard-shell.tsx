"use client";

import * as React from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SessionInactivityGuard } from "@/components/session-inactivity-guard";

const STORAGE_KEY = "sidebar-collapsed";

type DashboardShellProps = {
  children: React.ReactNode;
  email: string;
  roles: string[];
  universityId: string | null;
  brandTitle?: string;
  brandSubtitle?: string;
};

export function DashboardShell({
  children,
  email,
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
    <div className="flex min-h-screen w-full">
      <SessionInactivityGuard />
      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] shadow-xl transition-[transform,width] duration-200 ease-out md:static md:z-0 md:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } w-[min(17rem,88vw)] ${sidebarExpandedVisual ? "md:w-60" : "md:w-[4.5rem]"}`}
      >
        <DashboardSidebar
          roles={roles}
          universityId={universityId}
          brandTitle={brandTitle}
          brandSubtitle={brandSubtitle}
          collapsed={!sidebarExpandedVisual}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onNavigate={() => setMobileOpen(false)}
          onCloseMobile={() => setMobileOpen(false)}
          mobileOpen={mobileOpen}
        />
      </div>

      {/* Main column: top bar + page content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          email={email}
          roles={roles}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
