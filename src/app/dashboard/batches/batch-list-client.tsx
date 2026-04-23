"use client";

import Link from "next/link";
import * as React from "react";
import { formatDateLong } from "@/lib/format-date";

export type BatchListItem = {
  id: string;
  title: string;
  code: string;
  batchStartDate: string;
  admissionEndDate: string;
  ownerEmail: string | null;
};

function ownerInitial(email: string | null): string {
  if (!email) return "?";
  const c = email.charAt(0).toUpperCase();
  return c;
}

export function BatchListClient({ batches }: { batches: BatchListItem[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.ownerEmail?.toLowerCase().includes(q) ?? false),
    );
  }, [batches, query]);

  return (
    <div>
      <div className="relative max-w-xl">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search batches..."
          className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] py-3 pl-11 pr-5 text-sm text-[var(--foreground)] shadow-sm outline-none ring-[var(--primary)]/20 placeholder:text-[var(--foreground-muted)] focus:ring-2"
          aria-label="Search batches"
        />
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => (
          <li key={b.id}>
            <Link
              href={`/dashboard/batches/${b.id}`}
              className="block h-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-[var(--primary)]/40 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{b.title}</h2>
              <p className="mt-0.5 text-sm text-[var(--foreground-muted)]">{b.code}</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex gap-2">
                  <CalendarEditIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-blue)]" />
                  <div>
                    <p className="font-medium text-[var(--accent-blue)]">Batch start date</p>
                    <p className="text-[var(--accent-blue)]">{formatDateLong(new Date(b.batchStartDate))}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-teal)]" />
                  <div>
                    <p className="font-medium text-[var(--accent-teal)]">Admission end date</p>
                    <p className="text-[var(--foreground)]">{formatDateLong(new Date(b.admissionEndDate))}</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-[var(--border)] pt-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)] text-sm font-semibold text-white">
                  {ownerInitial(b.ownerEmail)}
                </span>
                <span className="truncate text-sm italic text-[var(--foreground-muted)]" title={b.ownerEmail ?? undefined}>
                  {b.ownerEmail ?? "—"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-[var(--foreground-muted)]">No batches match your search.</p>
      ) : null}
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

function CalendarEditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeLinecap="round" />
      <path d="M11 3L8.5 20" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
