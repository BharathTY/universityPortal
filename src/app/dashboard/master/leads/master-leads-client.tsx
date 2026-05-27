"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import type { AdmissionLeadStatus } from "@prisma/client";
import { LEAD_STATUS_OPTIONS } from "@/lib/lead-status";
import { leadStatusBadgeClass } from "@/lib/lead-status-ui";
import type {
  MasterLeadFilterOption,
  MasterLeadRow,
  MasterLeadsQuery,
  MasterLeadsSort,
  MasterLeadsSummary,
} from "@/lib/master-leads-data";

type LeadRowSerialized = Omit<MasterLeadRow, "createdAt"> & { createdAt: string };

type Props = {
  initialSummary: MasterLeadsSummary;
  initialFilterOptions: {
    universities: MasterLeadFilterOption[];
    streams: MasterLeadFilterOption[];
  };
  initialLeads: LeadRowSerialized[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  initialTotalPages: number;
  initialQuery: MasterLeadsQuery;
};

type ApiResponse = {
  leads?: LeadRowSerialized[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  summary?: MasterLeadsSummary;
  error?: string;
};

const SORT_OPTIONS: { value: MasterLeadsSort; label: string }[] = [
  { value: "latest", label: "Latest created" },
  { value: "oldest", label: "Oldest created" },
  { value: "name", label: "Student name" },
  { value: "university", label: "University" },
];

function queryFromParams(sp: URLSearchParams): MasterLeadsQuery {
  const sortRaw = sp.get("sort")?.trim();
  const sort: MasterLeadsSort =
    sortRaw === "oldest" || sortRaw === "name" || sortRaw === "university" ? sortRaw : "latest";

  return {
    q: sp.get("q")?.trim() || undefined,
    universityId: sp.get("universityId")?.trim() || undefined,
    streamId: sp.get("streamId")?.trim() || undefined,
    status: (sp.get("status")?.trim() || undefined) as AdmissionLeadStatus | undefined,
    createdFrom: sp.get("createdFrom")?.trim() || undefined,
    createdTo: sp.get("createdTo")?.trim() || undefined,
    sort,
    page: Math.max(1, Number(sp.get("page") ?? "1") || 1),
    pageSize: Math.min(100, Math.max(10, Number(sp.get("pageSize") ?? "25") || 25)),
  };
}

function buildSearchParams(query: MasterLeadsQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  if (query.universityId) p.set("universityId", query.universityId);
  if (query.streamId) p.set("streamId", query.streamId);
  if (query.status) p.set("status", query.status);
  if (query.createdFrom) p.set("createdFrom", query.createdFrom);
  if (query.createdTo) p.set("createdTo", query.createdTo);
  if (query.sort && query.sort !== "latest") p.set("sort", query.sort);
  if (query.page && query.page > 1) p.set("page", String(query.page));
  if (query.pageSize && query.pageSize !== 25) p.set("pageSize", String(query.pageSize));
  return p;
}

export function MasterLeadsClient(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();

  const summary = props.initialSummary;
  const [leads, setLeads] = React.useState<LeadRowSerialized[]>(props.initialLeads);
  const [total, setTotal] = React.useState(props.initialTotal);
  const [page, setPage] = React.useState(props.initialPage);
  const [pageSize] = React.useState(props.initialPageSize);
  const [totalPages, setTotalPages] = React.useState(props.initialTotalPages);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [q, setQ] = React.useState(props.initialQuery.q ?? "");
  const [universityId, setUniversityId] = React.useState(props.initialQuery.universityId ?? "");
  const [streamId, setStreamId] = React.useState(props.initialQuery.streamId ?? "");
  const [status, setStatus] = React.useState(props.initialQuery.status ?? "");
  const [createdFrom, setCreatedFrom] = React.useState(props.initialQuery.createdFrom ?? "");
  const [createdTo, setCreatedTo] = React.useState(props.initialQuery.createdTo ?? "");
  const [sort, setSort] = React.useState<MasterLeadsSort>(props.initialQuery.sort ?? "latest");

  const currentQuery = React.useMemo(
    (): MasterLeadsQuery => ({
      q: q.trim() || undefined,
      universityId: universityId || undefined,
      streamId: streamId || undefined,
      status: (status || undefined) as AdmissionLeadStatus | undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      sort,
      page,
      pageSize,
    }),
    [q, universityId, streamId, status, createdFrom, createdTo, sort, page, pageSize],
  );

  const applyQuery = React.useCallback(
    (next: MasterLeadsQuery, replace = false) => {
      const p = buildSearchParams({ ...next, page: next.page ?? 1 });
      const href = p.toString() ? `${pathname}?${p.toString()}` : pathname;
      if (replace) router.replace(href);
      else router.push(href);
    },
    [pathname, router],
  );

  const fetchLeads = React.useCallback(async (query: MasterLeadsQuery) => {
    setLoading(true);
    setError(null);
    try {
      const p = buildSearchParams(query);
      const res = await fetch(`/api/master/leads?${p.toString()}`);
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok) {
        setError(data.error ?? "Could not load leads");
        return;
      }
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? 1);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const fromUrl = queryFromParams(urlSearchParams);
    setQ(fromUrl.q ?? "");
    setUniversityId(fromUrl.universityId ?? "");
    setStreamId(fromUrl.streamId ?? "");
    setStatus(fromUrl.status ?? "");
    setCreatedFrom(fromUrl.createdFrom ?? "");
    setCreatedTo(fromUrl.createdTo ?? "");
    setSort(fromUrl.sort ?? "latest");
    setPage(fromUrl.page ?? 1);

    const urlKey = urlSearchParams.toString();
    const initialKey = buildSearchParams(props.initialQuery).toString();
    if (urlKey !== initialKey) {
      void fetchLeads(fromUrl);
    }
  }, [urlSearchParams, fetchLeads, props.initialQuery]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushFilters({ q: q.trim() || undefined });
  }

  function pushFilters(patch: Partial<MasterLeadsQuery>) {
    const next: MasterLeadsQuery = {
      q: q.trim() || undefined,
      universityId: universityId || undefined,
      streamId: streamId || undefined,
      status: (status || undefined) as AdmissionLeadStatus | undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      sort,
      page: 1,
      pageSize,
      ...patch,
    };
    applyQuery(next);
  }

  function onSummaryCardClick(patch: Partial<MasterLeadsQuery>) {
    const next: MasterLeadsQuery = {
      q: undefined,
      universityId: undefined,
      streamId: undefined,
      status: undefined,
      createdFrom: undefined,
      createdTo: undefined,
      sort: "latest",
      page: 1,
      pageSize,
      ...patch,
    };
    setQ("");
    setUniversityId(next.universityId ?? "");
    setStreamId(next.streamId ?? "");
    setStatus(next.status ?? "");
    setCreatedFrom(next.createdFrom ?? "");
    setCreatedTo(next.createdTo ?? "");
    setSort(next.sort ?? "latest");
    setPage(1);
    applyQuery(next);
  }

  const summaryCards = [
    { label: "Total leads", value: summary.total, onClick: () => onSummaryCardClick({}) },
    {
      label: "New",
      value: summary.newLeads,
      onClick: () => onSummaryCardClick({ status: "NEW_LEAD" }),
    },
    {
      label: "Ready to pay",
      value: summary.readyToPay,
      onClick: () => onSummaryCardClick({ status: "READY_TO_PAY" }),
    },
    {
      label: "Paid",
      value: summary.paid,
      onClick: () => onSummaryCardClick({ status: "PAYMENT_DONE" }),
    },
    {
      label: "Rejected",
      value: summary.rejected,
      onClick: () => onSummaryCardClick({ status: "NOT_INTERESTED" }),
    },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-left shadow-sm transition hover:border-[var(--primary)]/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">{card.value}</p>
          </button>
        ))}
      </div>

      <form onSubmit={onSearchSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="lead-search" className="text-sm font-medium text-[var(--foreground)]">
            Search
          </label>
          <input
            id="lead-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Student name, email, or mobile"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)]"
        >
          Search
        </button>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div>
          <label className="text-xs font-medium text-[var(--foreground-muted)]">University</label>
          <select
            value={universityId}
            onChange={(e) => {
              const v = e.target.value;
              setUniversityId(v);
              pushFilters({ universityId: v || undefined });
            }}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
          >
            <option value="">All universities</option>
            {props.initialFilterOptions.universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--foreground-muted)]">Stream</label>
          <select
            value={streamId}
            onChange={(e) => {
              const v = e.target.value;
              setStreamId(v);
              pushFilters({ streamId: v || undefined });
            }}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
          >
            <option value="">All streams</option>
            {props.initialFilterOptions.streams.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--foreground-muted)]">Lead status</label>
          <select
            value={status}
            onChange={(e) => {
              const v = e.target.value;
              setStatus(v);
              pushFilters({ status: (v || undefined) as AdmissionLeadStatus | undefined });
            }}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {LEAD_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--foreground-muted)]">Created from</label>
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => {
              const v = e.target.value;
              setCreatedFrom(v);
              pushFilters({ createdFrom: v || undefined });
            }}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--foreground-muted)]">Created to</label>
          <input
            type="date"
            value={createdTo}
            onChange={(e) => {
              const v = e.target.value;
              setCreatedTo(v);
              pushFilters({ createdTo: v || undefined });
            }}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--foreground-muted)]">Sort</label>
          <select
            value={sort}
            onChange={(e) => {
              const v = e.target.value as MasterLeadsSort;
              setSort(v);
              pushFilters({ sort: v });
            }}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-8 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">Loading leads…</p>
        ) : leads.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">No leads match your filters.</p>
        ) : (
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
              <tr>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Student details</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">University</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Stream</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Consultant</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Payment</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Ageing</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Lead status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-3">
                    <div className="font-medium text-[var(--foreground)]">
                      {l.firstName} {l.lastName}
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)]">{l.email}</div>
                    <div className="text-xs tabular-nums text-[var(--foreground-muted)]">{l.mobile}</div>
                  </td>
                  <td className="px-3 py-3 text-[var(--foreground)]">{l.universityName}</td>
                  <td className="px-3 py-3 text-[var(--foreground-muted)]">{l.streamName}</td>
                  <td className="px-3 py-3">
                    <div className="text-[var(--foreground)]">{l.consultantCompany ?? "—"}</div>
                    {l.consultantSpocName ? (
                      <div className="text-xs text-[var(--foreground-muted)]">SPOC: {l.consultantSpocName}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        l.paymentStatus === "Paid"
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                          : "badge-pending"
                      }`}
                    >
                      {l.paymentStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 tabular-nums text-[var(--foreground-muted)]">{l.ageingDays}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${leadStatusBadgeClass(l.statusRaw)}`}
                    >
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-[var(--foreground-muted)]">
            Showing page {page} of {totalPages} ({total} leads)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => applyQuery({ ...currentQuery, page: page - 1 })}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-medium disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => applyQuery({ ...currentQuery, page: page + 1 })}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--foreground-muted)]">{total} lead{total === 1 ? "" : "s"}</p>
      )}

      <p className="mt-6 text-xs text-[var(--foreground-muted)]">
        <Link href="/dashboard/master" className="text-[var(--primary)] underline-offset-2 hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
