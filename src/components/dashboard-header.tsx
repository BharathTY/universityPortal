"use client";

import * as React from "react";
import { ConsultantUniversitySwitcher } from "@/components/consultant-university-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatRoleLabel } from "@/lib/roles";

/** Derive a display name from the email local part (e.g. preeti.s → Preeti S). */
function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "User";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return "User";
  return parts
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

type DashboardHeaderProps = {
  email: string;
  roles: string[];
};

export function DashboardHeader({ email, roles }: DashboardHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  const roleText =
    roles.length > 0 ? roles.map(formatRoleLabel).join(", ") : "No role assigned";
  const primaryRoleLine =
    roles.length > 0 ? formatRoleLabel(roles[0]!) : "No role assigned";
  const displayName = displayNameFromEmail(email);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <ConsultantUniversitySwitcher roles={roles} />
        <ThemeToggle />

        <div className="relative" ref={wrapRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
            className="flex max-w-[min(100vw-8rem,18rem)] items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 text-left shadow-sm transition hover:bg-[var(--muted)]/40 sm:max-w-xs"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-inner ring-2 ring-white/25"
              aria-hidden
            >
              <span className="sr-only">{displayName}</span>
              <UserAvatarIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                {displayName}
              </span>
              <span className="block truncate text-xs text-[var(--foreground-muted)]">
                {primaryRoleLine}
              </span>
            </span>
            <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-[var(--foreground-muted)]" />
          </button>

          {open ? (
            <div
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-[min(calc(100vw-2rem),20rem)] rounded-2xl border border-[var(--border)] bg-[var(--background)] py-4 shadow-lg"
            >
              <div className="flex flex-col items-center px-4 pb-2">
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md ring-4 ring-[var(--muted)]"
                  aria-hidden
                >
                  <UserAvatarIcon className="h-9 w-9" />
                </span>
                <p className="mt-3 text-center text-base font-semibold text-[var(--foreground)]">
                  {roleText}
                </p>
                <p className="mt-1 max-w-full truncate px-1 text-center text-sm text-[var(--foreground-muted)]">
                  {email}
                </p>
              </div>
              <div className="mx-3 my-2 border-t border-[var(--border)]" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void logout();
                }}
                className="mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)]"
              >
                <LogoutDoorIcon className="h-5 w-5 shrink-0 text-[var(--foreground-muted)]" />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function UserAvatarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5z" />
    </svg>
  );
}

function ChevronUpDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M7 15l5 5 5-5M7 9l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutDoorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
