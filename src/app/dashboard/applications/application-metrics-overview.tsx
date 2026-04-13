"use client";

import * as React from "react";
import type { ApplicationMetricRow } from "@/lib/application-metrics";

type Props = {
  rows: ApplicationMetricRow[];
};

export function ApplicationMetricsOverview({ rows }: Props) {
  const [open, setOpen] = React.useState(true);

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Metrics Overview</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex w-fit items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--muted)]/50"
        >
          {open ? "Hide metrics" : "Show metrics"}
        </button>
      </div>

      {open ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((row) => (
            <article
              key={row.id}
              className={`rounded-2xl border p-5 shadow-sm transition ${
                row.highlight
                  ? "border-[var(--accent-blue)]/60 bg-[var(--accent-blue)]/10 ring-1 ring-[var(--accent-blue)]/25"
                  : "border-[var(--border)] bg-[var(--card)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <MetricGlyph id={row.id} highlighted={Boolean(row.highlight)} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-snug text-[var(--foreground-muted)]">{row.label}</p>
                  <p
                    className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${
                      row.highlight ? "text-[var(--accent-blue)]" : "text-[var(--foreground)]"
                    }`}
                  >
                    {row.value}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function MetricGlyph({ id, highlighted }: { id: string; highlighted: boolean }) {
  const cls = `h-10 w-10 shrink-0 rounded-xl border p-2 ${
    highlighted
      ? "border-[var(--accent-blue)]/40 bg-white/80 text-[var(--accent-blue)] dark:bg-[var(--background)]"
      : "border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground-muted)]"
  }`;
  return (
    <span className={cls} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-full w-full">
        {glyphPath(id)}
      </svg>
    </span>
  );
}

function glyphPath(id: string) {
  switch (id) {
    case "total":
      return <path d="M4 19h16M6 17V9l4-4 4 4v8M10 17v-4h4v4" strokeLinecap="round" strokeLinejoin="round" />;
    case "APPLICATION_DETAILS_PENDING":
      return (
        <>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M12 18h4" strokeLinecap="round" />
        </>
      );
    case "REGISTRATION_FEE_PENDING":
      return <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H6" strokeLinecap="round" />;
    case "PROGRAM_FEE_PENDING":
      return (
        <>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 12h4M14 12h4M6 16h12" strokeLinecap="round" />
        </>
      );
    case "APPLICANT_KYC_PENDING":
      return (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4 20c1.8-4 6-6 8-6s6.2 2 8 6" strokeLinecap="round" />
        </>
      );
    case "PERSONAL_DETAILS_PENDING":
      return <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" />;
    case "EDUCATION_DETAILS_PENDING":
      return (
        <>
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" />
          <path d="M6.5 2H20v15H6.5A2.5 2.5 0 014 14.5V4.5A2.5 2.5 0 016.5 2z" />
          <path d="M8 7h8M8 11h5" strokeLinecap="round" />
        </>
      );
    case "DOCUMENTS_PENDING":
      return (
        <>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M10 13h4M10 17h4" strokeLinecap="round" />
        </>
      );
    case "UNDER_L1_VERIFICATION":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "UNDER_L2_VERIFICATION":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8M12 8v8" strokeLinecap="round" />
        </>
      );
    case "REJECTED":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
        </>
      );
    case "COMPLETED":
      return (
        <>
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" />
          <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="9" />;
  }
}
