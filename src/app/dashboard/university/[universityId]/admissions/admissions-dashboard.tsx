"use client";

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
  admissionStatus: string;
  createdAt: string;
  academicYear: { label: string };
  stream: { name: string };
};

type AdmissionsDashboardProps = {
  universityId: string;
  listPathSegment?: "admissions" | "uni-admissions";
  breadcrumbLabel?: string;
  pageTitle?: string;
  pageSubtitle?: string;
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

const LEAD_STATUS_OPTIONS = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "ADMITTED",
  "REJECTED",
  "WITHDRAWN",
] as const;

type HistoryEntry = {
  id: string;
  fromStatus: string;
  toStatus: string;
  createdAt: string;
  changedBy: { name: string | null; email: string } | null;
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
  listPathSegment = "admissions",
  breadcrumbLabel = "Admissions",
  pageTitle = "Admissions",
  pageSubtitle = "Admission leads — filter by academic year and degree.",
  years,
  streams,
  leads,
  total,
  page,
  totalPages,
  selectedYearId,
  selectedStreamId,
}: AdmissionsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busyLeadId, setBusyLeadId] = React.useState<string | null>(null);
  const [statusError, setStatusError] = React.useState<string | null>(null);

  const [historyLeadId, setHistoryLeadId] = React.useState<string | null>(null);
  const [historyLeadName, setHistoryLeadName] = React.useState("");
  const [historyEntries, setHistoryEntries] = React.useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);

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

    router.push(`/dashboard/university/${universityId}/${listPathSegment}?${p.toString()}`);
  }

  async function onStatusChange(leadId: string, nextStatus: string, prevStatus: string) {
    if (nextStatus === prevStatus) return;
    setStatusError(null);
    setBusyLeadId(leadId);
    try {
      const res = await fetch(`/api/university/${universityId}/admission-leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admissionStatus: nextStatus }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatusError(data.error ?? "Could not update status");
        return;
      }
      router.refresh();
    } finally {
      setBusyLeadId(null);
    }
  }

  async function openHistory(leadId: string, leadLabel: string) {
    setHistoryLeadId(leadId);
    setHistoryLeadName(leadLabel);
    setHistoryEntries([]);
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/university/${universityId}/admission-leads/${leadId}/status-history`);
      const data = (await res.json().catch(() => ({}))) as { error?: string; entries?: HistoryEntry[] };
      if (!res.ok) {
        setHistoryError(data.error ?? "Could not load history");
        return;
      }
      setHistoryEntries(data.entries ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeHistory() {
    setHistoryLeadId(null);
    setHistoryEntries([]);
    setHistoryError(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="text-sm text-[var(--foreground-muted)]" aria-label="Breadcrumb">
        <span className="text-[var(--foreground)]">University</span>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-[var(--foreground)]">{breadcrumbLabel}</span>
      </nav>

      <div className="mt-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{pageTitle}</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">{pageSubtitle}</p>
        </div>
      </div>

      {statusError ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {statusError}
        </p>
      ) : null}

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
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Degree</p>
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
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[var(--muted)]/50 text-[var(--foreground-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">First name</th>
                <th className="px-4 py-3 font-medium">Last name</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Year / degree</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-[var(--foreground-muted)]">
                    No leads match these filters. Academic years and degrees are set up from the Master portal
                    (Universities).
                  </td>
                </tr>
              ) : (
                leads.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{row.firstName}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{row.lastName}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--foreground-muted)]">{row.mobile}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{row.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[11rem] flex-col gap-1.5">
                        <select
                          value={row.admissionStatus}
                          disabled={busyLeadId === row.id}
                          onChange={(e) => void onStatusChange(row.id, e.target.value, row.admissionStatus)}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs font-medium text-[var(--foreground)] disabled:opacity-50"
                          aria-label={`Status for ${row.firstName} ${row.lastName}`}
                        >
                          {LEAD_STATUS_OPTIONS.map((v) => (
                            <option key={v} value={v}>
                              {statusLabel[v] ?? v}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void openHistory(row.id, `${row.firstName} ${row.lastName}`.trim())}
                          className="w-fit text-xs font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                        >
                          Status history
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">
                      {row.academicYear.label} · {row.stream.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--foreground-muted)]">
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

      {historyLeadId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-status-history-title"
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h2 id="lead-status-history-title" className="text-base font-semibold text-[var(--foreground)]">
                Status history
              </h2>
              <button
                type="button"
                onClick={closeHistory}
                className="rounded-lg px-2 py-1 text-sm text-[var(--foreground-muted)] hover:bg-[var(--muted)]"
              >
                Close
              </button>
            </div>
            <p className="border-b border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground-muted)]">
              {historyLeadName}
            </p>
            <div className="max-h-[55vh] overflow-y-auto px-4 py-3">
              {historyLoading ? (
                <p className="text-sm text-[var(--foreground-muted)]">Loading…</p>
              ) : historyError ? (
                <p className="text-sm text-red-600">{historyError}</p>
              ) : historyEntries.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)]">
                  No changes yet. Updates appear here when you change status from this screen.
                </p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {historyEntries.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    >
                      <p className="font-medium text-[var(--foreground)]">
                        {statusLabel[e.fromStatus] ?? e.fromStatus} → {statusLabel[e.toStatus] ?? e.toStatus}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{formatDateTime(e.createdAt)}</p>
                      <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                        {e.changedBy
                          ? e.changedBy.name?.trim() || e.changedBy.email
                          : "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
