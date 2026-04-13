"use client";

import * as React from "react";

type LeadsViewProps = {
  batchTitle: string;
  batchCode: string;
};

export function LeadsView({ batchTitle, batchCode }: LeadsViewProps) {
  const [env, setEnv] = React.useState<"test" | "live">("live");
  const [tab, setTab] = React.useState<"referrals" | "others">("referrals");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <nav className="text-sm text-[var(--foreground-muted)]" aria-label="Breadcrumb">
          <span className="text-[var(--foreground)]">University Portal</span>
          <span className="mx-1.5">/</span>
          <span>Batches</span>
          <span className="mx-1.5">/</span>
          <span className="font-medium text-[var(--foreground)]">{batchTitle}</span>
        </nav>
        <div
          className="inline-flex rounded-full border border-[var(--border)] bg-[var(--muted)]/50 p-1"
          role="group"
          aria-label="Environment"
        >
          <button
            type="button"
            onClick={() => setEnv("test")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              env === "test" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)]"
            }`}
          >
            Test
          </button>
          <button
            type="button"
            onClick={() => setEnv("live")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              env === "live" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)]"
            }`}
          >
            Live
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Leads</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Manage and track all leads for this batch ({batchCode})
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-blue-hover)]"
          >
            Bulk Upload
          </button>
          <button
            type="button"
            className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-blue-hover)]"
          >
            Lead Punch
          </button>
        </div>
      </div>

      <div className="mt-6 inline-flex rounded-full border border-[var(--border)] bg-[var(--muted)]/40 p-1">
        <button
          type="button"
          onClick={() => setTab("referrals")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition ${
            tab === "referrals" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)]"
          }`}
        >
          Referrals
        </button>
        <button
          type="button"
          onClick={() => setTab("others")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition ${
            tab === "others" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)]"
          }`}
        >
          Others
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Leads</p>
            <p className="text-xs text-[var(--foreground-muted)]">Showing 0 of 0 Leads</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
              aria-label="Search"
            >
              <SearchIcon />
            </button>
            <select
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              defaultValue="all"
              aria-label="Filter"
            >
              <option value="all">All (No Filters)</option>
            </select>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)]"
            >
              <SlidersIcon />
              View
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--muted)]/50 text-[var(--foreground-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">First Name</th>
                <th className="px-4 py-3 font-medium">Last Name</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={2} className="px-4 py-16 text-center text-[var(--foreground-muted)]">
                  No leads yet — data will appear here when you add leads.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--foreground-muted)]">
          <label className="flex items-center gap-2">
            Rows Per Page
            <select className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[var(--foreground)]" defaultValue="10">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" strokeLinecap="round" />
    </svg>
  );
}
