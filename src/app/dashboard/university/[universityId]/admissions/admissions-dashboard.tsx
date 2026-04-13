"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

export type AdmissionsYearOption = { id: string; label: string };
export type AdmissionsStreamOption = { id: string; name: string };

export type AdmissionLeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  consultantCode: string;
  roleLabel: string;
  admissionStatus: string;
  createdAt: string;
  academicYear: { label: string };
  stream: { name: string };
};

type AdmissionsDashboardProps = {
  universityId: string;
  years: AdmissionsYearOption[];
  streams: AdmissionsStreamOption[];
  leads: AdmissionLeadRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  selectedYearId: string | null;
  selectedStreamId: string | null;
};

const statusLabel: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  ADMITTED: "Admitted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdmissionsDashboard({
  universityId,
  years,
  streams,
  leads,
  total,
  page,
  pageSize,
  totalPages,
  selectedYearId,
  selectedStreamId,
}: AdmissionsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(next: { yearId?: string | null; streamId?: string | null; page?: number }) {
    const p = new URLSearchParams(searchParams.toString());
    const y = next.yearId !== undefined ? next.yearId : selectedYearId;
    const s = next.streamId !== undefined ? next.streamId : selectedStreamId;
    const pg = next.page ?? 1;

    if (y) p.set("year", y);
    else p.delete("year");
    if (s) p.set("stream", s);
    else p.delete("stream");
    if (pg > 1) p.set("page", String(pg));
    else p.delete("page");

    router.push(`/dashboard/university/${universityId}/admissions?${p.toString()}`);
  }

  const leadPunchHref = `/dashboard/university/${universityId}/admissions/leads/new`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="text-sm text-[var(--foreground-muted)]" aria-label="Breadcrumb">
        <span className="text-[var(--foreground)]">University</span>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-[var(--foreground)]">Admissions</span>
      </nav>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Admissions</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Leads with consultant codes — filter by academic year and stream.
          </p>
        </div>
        <Link
          href={leadPunchHref}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-blue-hover)]"
        >
          Lead punch
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Academic year</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter({ yearId: null, page: 1 })}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                !selectedYearId
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground-muted)] hover:bg-[var(--muted)]"
              }`}
            >
              All
            </button>
            {years.map((y) => (
              <button
                key={y.id}
                type="button"
                onClick={() => setFilter({ yearId: y.id, page: 1 })}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  selectedYearId === y.id
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground-muted)] hover:bg-[var(--muted)]"
                }`}
              >
                {y.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Streams</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter({ streamId: null, page: 1 })}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                !selectedStreamId
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground-muted)] hover:bg-[var(--muted)]"
              }`}
            >
              All
            </button>
            {streams.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setFilter({ streamId: s.id, page: 1 })}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  selectedStreamId === s.id
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground-muted)] hover:bg-[var(--muted)]"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[var(--foreground)]">Leads</p>
          <p className="text-xs text-[var(--foreground-muted)]">
            Showing {leads.length} of {total} lead{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[var(--muted)]/50 text-[var(--foreground-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">First name</th>
                <th className="px-4 py-3 font-medium">Last name</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Consultant code</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Year / stream</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-[var(--foreground-muted)]">
                    No leads match these filters. Use <strong className="text-[var(--foreground)]">Lead punch</strong>{" "}
                    or <strong className="text-[var(--foreground)]">Add lead</strong> in the sidebar.
                  </td>
                </tr>
              ) : (
                leads.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{row.firstName}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{row.lastName}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--foreground-muted)]">{row.mobile}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{row.email}</td>
                    <td className="px-4 py-3 font-mono text-sm text-[var(--foreground)]">{row.consultantCode}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{row.roleLabel}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)]">
                        {statusLabel[row.admissionStatus] ?? row.admissionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">
                      {row.academicYear.label} · {row.stream.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--foreground-muted)]">
                      {formatDateTime(row.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setFilter({ page: page - 1 })}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-medium disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setFilter({ page: page + 1 })}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
