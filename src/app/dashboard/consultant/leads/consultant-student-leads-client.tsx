"use client";



import Link from "next/link";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import * as React from "react";

import type { AdmissionLeadStatus } from "@prisma/client";

import { ConsultantBulkCsvPanel } from "@/components/consultant-bulk-csv-panel";

import { PaymentCollectorModal } from "@/components/payment-collector-modal";

import { LEAD_STATUS_OPTIONS, isReadyToPayStatus } from "@/lib/lead-status";
import {
  canTransitionLeadStatus,
  LEAD_STATUS_WORKFLOW_MESSAGE,
  isLeadStatusOptionEnabled,
} from "@/lib/lead-status-workflow";

import { leadAgeingBadgeClass } from "@/lib/lead-status-ui";

import type {

  ConsultantLeadFilterOption,

  ConsultantLeadRow,

  ConsultantLeadsQuery,

  ConsultantLeadsSort,

  ConsultantLeadsSummary,

} from "@/lib/consultant-leads-data";



type LeadRowSerialized = Omit<ConsultantLeadRow, "createdAt"> & { createdAt: string };



type UniversityWithStreams = {

  id: string;

  name: string;

  code: string;

  streams: { id: string; name: string }[];

};



type Props = {

  initialSummary: ConsultantLeadsSummary;

  initialFilterOptions: {

    universities: ConsultantLeadFilterOption[];

    streams: ConsultantLeadFilterOption[];

  };

  initialLeads: LeadRowSerialized[];

  initialTotal: number;

  initialPage: number;

  initialPageSize: number;

  initialTotalPages: number;

  initialQuery: ConsultantLeadsQuery;

  universities: UniversityWithStreams[];

  studentPortalUrl: string;

};



type ApiResponse = {

  leads?: LeadRowSerialized[];

  total?: number;

  page?: number;

  pageSize?: number;

  totalPages?: number;

  error?: string;

};



const SORT_OPTIONS: { value: ConsultantLeadsSort; label: string }[] = [

  { value: "latest", label: "Latest created" },

  { value: "oldest", label: "Oldest created" },

  { value: "name", label: "Student name" },

  { value: "university", label: "University" },

];



function formatInr(value: number | null | undefined): string {

  if (value == null || !Number.isFinite(value)) return "Amount on file";

  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

}



function queryFromParams(sp: URLSearchParams): ConsultantLeadsQuery {

  const sortRaw = sp.get("sort")?.trim();

  const sort: ConsultantLeadsSort =

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



function buildSearchParams(query: ConsultantLeadsQuery): URLSearchParams {

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



function SummaryIcon({ kind }: { kind: "total" | "new" | "ready" | "paid" | "rejected" }) {

  const cls = "h-5 w-5 text-[var(--foreground-muted)]";

  if (kind === "total") {

    return (

      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>

        <path strokeLinecap="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />

      </svg>

    );

  }

  if (kind === "new") {

    return (

      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>

        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />

      </svg>

    );

  }

  if (kind === "ready") {

    return (

      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>

        <rect x="2" y="5" width="20" height="14" rx="2" />

        <path strokeLinecap="round" d="M2 10h20" />

      </svg>

    );

  }

  if (kind === "paid") {

    return (

      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>

        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

      </svg>

    );

  }

  return (

    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>

      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />

    </svg>

  );

}



export function ConsultantStudentLeadsClient(props: Props) {

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

  const [statusError, setStatusError] = React.useState<string | null>(null);

  const [busyLeadId, setBusyLeadId] = React.useState<string | null>(null);

  const [deleteBusyId, setDeleteBusyId] = React.useState<string | null>(null);



  const [q, setQ] = React.useState(props.initialQuery.q ?? "");

  const [universityId, setUniversityId] = React.useState(props.initialQuery.universityId ?? "");

  const [streamId, setStreamId] = React.useState(props.initialQuery.streamId ?? "");

  const [status, setStatus] = React.useState(props.initialQuery.status ?? "");

  const [createdFrom, setCreatedFrom] = React.useState(props.initialQuery.createdFrom ?? "");

  const [sort, setSort] = React.useState<ConsultantLeadsSort>(props.initialQuery.sort ?? "latest");



  const [bulkOpen, setBulkOpen] = React.useState(false);

  const [bulkUniversityId, setBulkUniversityId] = React.useState(props.universities[0]?.id ?? "");



  const [paymentLead, setPaymentLead] = React.useState<LeadRowSerialized | null>(null);

  const [paymentBusy, setPaymentBusy] = React.useState(false);

  const [paymentError, setPaymentError] = React.useState<string | null>(null);



  const bulkUniversity = props.universities.find((u) => u.id === bulkUniversityId) ?? props.universities[0];



  const applyQuery = React.useCallback(

    (next: ConsultantLeadsQuery, replace = false) => {

      const p = buildSearchParams({ ...next, page: next.page ?? 1 });

      const href = p.toString() ? `${pathname}?${p.toString()}` : pathname;

      if (replace) router.replace(href);

      else router.push(href);

    },

    [pathname, router],

  );



  const fetchLeads = React.useCallback(async (query: ConsultantLeadsQuery) => {

    setLoading(true);

    setError(null);

    try {

      const p = buildSearchParams(query);

      p.set("scope", "all");

      const res = await fetch(`/api/consultant/leads?${p.toString()}`);

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

    setSort(fromUrl.sort ?? "latest");

    setPage(fromUrl.page ?? 1);



    const urlKey = urlSearchParams.toString();

    const initialKey = buildSearchParams(props.initialQuery).toString();

    if (urlKey !== initialKey) {

      void fetchLeads(fromUrl);

    }

  }, [urlSearchParams, fetchLeads, props.initialQuery]);



  function pushFilters(patch: Partial<ConsultantLeadsQuery>) {

    const next: ConsultantLeadsQuery = {

      q: q.trim() || undefined,

      universityId: universityId || undefined,

      streamId: streamId || undefined,

      status: (status || undefined) as AdmissionLeadStatus | undefined,

      createdFrom: createdFrom || undefined,

      sort,

      page: 1,

      pageSize,

      ...patch,

    };

    applyQuery(next);

  }



  function onSummaryCardClick(patch: Partial<ConsultantLeadsQuery>) {

    const next: ConsultantLeadsQuery = {

      q: undefined,

      universityId: undefined,

      streamId: undefined,

      status: undefined,

      createdFrom: undefined,

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

    setSort(next.sort ?? "latest");

    setPage(1);

    applyQuery(next);

  }



  async function onStatusChange(leadId: string, nextStatus: AdmissionLeadStatus, prevStatus: AdmissionLeadStatus) {

    if (nextStatus === prevStatus) return;

    if (!canTransitionLeadStatus(prevStatus, nextStatus)) {
      setStatusError(LEAD_STATUS_WORKFLOW_MESSAGE);
      return;
    }

    setStatusError(null);

    setBusyLeadId(leadId);

    try {

      const res = await fetch(`/api/consultant/leads/${leadId}`, {

        method: "PATCH",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ admissionStatus: nextStatus }),

      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {

        setStatusError(data.error ?? "Could not update status");

        return;

      }

      const fromUrl = queryFromParams(urlSearchParams);

      await fetchLeads(fromUrl);

      router.refresh();

    } finally {

      setBusyLeadId(null);

    }

  }



  async function onDeleteLead(leadId: string, studentName: string) {

    if (!window.confirm(`Delete lead for ${studentName}? This cannot be undone.`)) return;

    setError(null);

    setDeleteBusyId(leadId);

    try {

      const res = await fetch(`/api/consultant/leads/${leadId}`, { method: "DELETE" });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {

        setError(data.error ?? "Could not delete lead");

        return;

      }

      const fromUrl = queryFromParams(urlSearchParams);

      await fetchLeads(fromUrl);

      router.refresh();

    } finally {

      setDeleteBusyId(null);

    }

  }



  async function onConfirmStudentPaid(payload: { paymentMethod: "UPI" | "CASH"; upiId?: string }) {
    if (!paymentLead) return;
    setPaymentError(null);
    setPaymentBusy(true);
    try {
      const res = await fetch(`/api/consultant/leads/${paymentLead.id}/collect-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {

        setPaymentError(data.error ?? "Could not record payment");

        return;

      }

      setPaymentLead(null);

      const fromUrl = queryFromParams(urlSearchParams);

      await fetchLeads(fromUrl);

      router.refresh();

    } finally {

      setPaymentBusy(false);

    }

  }



  async function openBulkUpload() {

    const uniId = universityId || props.universities[0]?.id;

    if (!uniId) return;

    setBulkUniversityId(uniId);

    if (uniId) {

      await fetch("/api/auth/active-university", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ universityId: uniId }),

      });

    }

    setBulkOpen(true);

  }



  async function onBulkUniversityChange(id: string) {

    setBulkUniversityId(id);

    await fetch("/api/auth/active-university", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ universityId: id }),

    });

  }



  const summaryCards = [

    { label: "Total leads", value: summary.total, kind: "total" as const, onClick: () => onSummaryCardClick({}) },

    {

      label: "New students",

      value: summary.newLeads,

      kind: "new" as const,

      onClick: () => onSummaryCardClick({ status: "NEW_LEAD" }),

    },

    {

      label: "Ready to pay",

      value: summary.readyToPay,

      kind: "ready" as const,

      onClick: () => onSummaryCardClick({ status: "READY_TO_PAY" }),

    },

    {

      label: "Paid students",

      value: summary.paid,

      kind: "paid" as const,

      onClick: () => onSummaryCardClick({ status: "PAYMENT_DONE" }),

    },

    {

      label: "Rejected",

      value: summary.rejected,

      kind: "rejected" as const,

      onClick: () => onSummaryCardClick({ status: "NOT_INTERESTED" }),

    },

  ];



  const addLeadHref = universityId
    ? `/dashboard/consultant/leads/new?universityId=${universityId}`
    : "/dashboard/consultant/leads/new";



  return (

    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">

      <div className="flex flex-wrap items-end justify-between gap-4">

        <div>

          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Consultant</p>

          <h1 className="font-serif text-3xl font-bold text-[var(--foreground)]">Student Leads</h1>

          <p className="mt-2 text-sm text-[var(--foreground-muted)]">

            Add, bulk-upload, change status, or collect payment directly.

          </p>

        </div>

        {props.universities.length > 0 ? (

          <div className="flex flex-wrap gap-2">

            <button

              type="button"

              onClick={() => void openBulkUpload()}

              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"

            >

              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />

              </svg>

              Bulk Upload

            </button>

            <Link

              href={addLeadHref}

              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-teal)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"

            >

              <span aria-hidden>+</span> Add Lead

            </Link>

          </div>

        ) : null}

      </div>



      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

        {summaryCards.map((card) => (

          <button

            key={card.label}

            type="button"

            onClick={card.onClick}

            className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-left shadow-sm transition hover:border-[var(--primary)]/40"

          >

            <SummaryIcon kind={card.kind} />

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">

                {card.label}

              </p>

              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--foreground)]">{card.value}</p>

            </div>

          </button>

        ))}

      </div>



      <form

        onSubmit={(e) => {

          e.preventDefault();

          pushFilters({ q: q.trim() || undefined });

        }}

        className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"

      >

        <div className="sm:col-span-2 lg:col-span-2">

          <input

            type="search"

            value={q}

            onChange={(e) => setQ(e.target.value)}

            placeholder="Search name / email / mobile…"

            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"

          />

        </div>

        <div>

          <select

            value={universityId}

            onChange={(e) => {

              const v = e.target.value;

              setUniversityId(v);

              pushFilters({ universityId: v || undefined });

            }}

            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"

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

          <select

            value={streamId}

            onChange={(e) => {

              const v = e.target.value;

              setStreamId(v);

              pushFilters({ streamId: v || undefined });

            }}

            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"

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

          <select

            value={status}

            onChange={(e) => {

              const v = e.target.value;

              setStatus(v);

              pushFilters({ status: (v || undefined) as AdmissionLeadStatus | undefined });

            }}

            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"

          >

            <option value="">All status</option>

            {LEAD_STATUS_OPTIONS.map((o) => (

              <option key={o.value} value={o.value}>

                {o.label}

              </option>

            ))}

          </select>

        </div>

        <div>

          <input

            type="date"

            value={createdFrom}

            onChange={(e) => {

              const v = e.target.value;

              setCreatedFrom(v);

              pushFilters({ createdFrom: v || undefined });

            }}

            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"

            aria-label="Created from date"

          />

        </div>

        <div className="sm:col-span-2 lg:col-span-1">

          <select

            value={sort}

            onChange={(e) => {

              const v = e.target.value as ConsultantLeadsSort;

              setSort(v);

              pushFilters({ sort: v });

            }}

            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"

          >

            {SORT_OPTIONS.map((o) => (

              <option key={o.value} value={o.value}>

                {o.label}

              </option>

            ))}

          </select>

        </div>

      </form>



      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {statusError ? <p className="mt-4 text-sm text-red-600">{statusError}</p> : null}



      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">

        {loading ? (

          <p className="px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">Loading leads…</p>

        ) : leads.length === 0 ? (

          <p className="px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">

            {props.universities.length === 0

              ? "No universities assigned yet."

              : "No leads match your filters."}

          </p>

        ) : (

          <table className="w-full min-w-[900px] text-left text-sm">

            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">

              <tr>

                <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Student</th>

                <th className="px-4 py-3 font-semibold text-[var(--foreground)]">University</th>

                <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Stream</th>

                <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Ageing</th>

                <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Status</th>

                <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Action</th>

              </tr>

            </thead>

            <tbody>

              {leads.map((l) => {

                const createdAt = new Date(l.createdAt);

                return (

                  <tr key={l.id} className="border-b border-[var(--border)] last:border-0">

                    <td className="px-4 py-3">

                      <p className="font-medium text-[var(--foreground)]">

                        {l.firstName} {l.lastName}

                      </p>

                      <p className="text-xs text-[var(--foreground-muted)]">{l.email}</p>

                    </td>

                    <td className="px-4 py-3 text-[var(--foreground)]">{l.universityName}</td>

                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{l.streamName}</td>

                    <td className="px-4 py-3">

                      <span

                        className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${leadAgeingBadgeClass(createdAt)}`}

                      >

                        {l.ageingDays}

                      </span>

                    </td>

                    <td className="px-4 py-3">

                      <select

                        value={l.statusRaw}

                        disabled={busyLeadId === l.id}

                        onChange={(e) =>

                          void onStatusChange(l.id, e.target.value as AdmissionLeadStatus, l.statusRaw)

                        }

                        className="max-w-[11rem] rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs"

                      >

                        {LEAD_STATUS_OPTIONS.map((opt) => (

                          <option key={opt.value} value={opt.value} disabled={!isLeadStatusOptionEnabled(l.statusRaw, opt.value)}>

                            {opt.label}

                          </option>

                        ))}

                      </select>

                    </td>

                    <td className="px-4 py-3">

                      <div className="flex flex-wrap items-center gap-2">

                        <Link

                          href={`/dashboard/consultant/leads/${l.id}/edit`}

                          className="inline-flex items-center rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"

                        >

                          Edit

                        </Link>

                        {isReadyToPayStatus(l.statusRaw) ? (

                          <button

                            type="button"

                            onClick={() => {

                              setPaymentError(null);

                              setPaymentLead(l);

                            }}

                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"

                          >

                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

                              <rect x="2" y="5" width="20" height="14" rx="2" />

                              <path strokeLinecap="round" d="M2 10h20" />

                            </svg>

                            Collect Payment

                          </button>

                        ) : l.statusRaw === "PAYMENT_DONE" ? (

                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Paid</span>

                        ) : null}

                      </div>

                    </td>

                  </tr>

                );

              })}

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

              onClick={() => applyQuery({ ...queryFromParams(urlSearchParams), page: page - 1 })}

              className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-medium disabled:opacity-50"

            >

              Previous

            </button>

            <button

              type="button"

              disabled={page >= totalPages || loading}

              onClick={() => applyQuery({ ...queryFromParams(urlSearchParams), page: page + 1 })}

              className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-medium disabled:opacity-50"

            >

              Next

            </button>

          </div>

        </div>

      ) : (

        <p className="mt-4 text-sm text-[var(--foreground-muted)]">

          {total} lead{total === 1 ? "" : "s"}

        </p>

      )}



      {bulkOpen && bulkUniversity ? (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"

          role="dialog"

          aria-modal="true"

          aria-labelledby="bulk-upload-title"

        >

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">

            <div className="flex items-start justify-between gap-3">

              <h2 id="bulk-upload-title" className="text-lg font-semibold text-[var(--foreground)]">

                Bulk upload

              </h2>

              <button

                type="button"

                onClick={() => setBulkOpen(false)}

                className="rounded-lg px-2 py-1 text-sm text-[var(--foreground-muted)] hover:bg-[var(--muted)]"

              >

                Close

              </button>

            </div>

            {props.universities.length > 1 ? (

              <div className="mt-4">

                <label className="text-sm font-medium text-[var(--foreground)]">University</label>

                <select

                  value={bulkUniversityId}

                  onChange={(e) => void onBulkUniversityChange(e.target.value)}

                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"

                >

                  {props.universities.map((u) => (

                    <option key={u.id} value={u.id}>

                      {u.name} ({u.code})

                    </option>

                  ))}

                </select>

              </div>

            ) : null}

            <ConsultantBulkCsvPanel

              showTitle={false}

              universityName={bulkUniversity.name}

              universityCode={bulkUniversity.code}

              streams={bulkUniversity.streams}

              onSuccess={async () => {

                const fromUrl = queryFromParams(urlSearchParams);

                await fetchLeads(fromUrl);

                router.refresh();

              }}

            />

          </div>

        </div>

      ) : null}



      <PaymentCollectorModal
        open={paymentLead != null}
        leadName={
          paymentLead ? `${paymentLead.firstName} ${paymentLead.lastName}`.trim() || paymentLead.email : ""
        }
        studentEmail={paymentLead?.email ?? ""}
        universityName={paymentLead?.universityName ?? ""}
        universityUpiId={paymentLead?.universityPaymentUpiId ?? null}
        amountLabel={formatInr(paymentLead?.registrationFee ?? null)}
        amountRupees={
          paymentLead?.registrationFee != null ? Number(String(paymentLead.registrationFee)) : undefined
        }
        hasStudentPortal={paymentLead?.hasStudentPortal ?? false}
        studentPortalUrl={props.studentPortalUrl}
        busy={paymentBusy}
        error={paymentError}
        onClose={() => (paymentBusy ? undefined : setPaymentLead(null))}
        onConfirmStudentPaid={onConfirmStudentPaid}
      />

    </div>

  );

}

