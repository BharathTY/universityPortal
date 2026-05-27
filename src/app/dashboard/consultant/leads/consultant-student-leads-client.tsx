"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { PaymentCollectorModal } from "@/components/payment-collector-modal";
import { ListQueryToolbar, SORT_LEADS } from "@/components/list-controls";
import { LEAD_STATUS_OPTIONS, isReadyToPayStatus } from "@/lib/lead-status";
import type { AdmissionLeadStatus } from "@prisma/client";

type LeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  admissionStatus: AdmissionLeadStatus;
  createdAt: string;
  university: { name: string; code: string; registrationFee: number | null };
  stream: { name: string };
};

type UniversityOption = { id: string; name: string; code: string };

type Props = {
  showAddForm?: boolean;
  universities: UniversityOption[];
};

function formatInr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Amount on file";
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ConsultantStudentLeadsClient({ showAddForm = false, universities }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "latest";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? "25") || 25));

  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<LeadRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [busyLeadId, setBusyLeadId] = React.useState<string | null>(null);
  const [statusError, setStatusError] = React.useState<string | null>(null);

  const [paymentLead, setPaymentLead] = React.useState<LeadRow | null>(null);
  const [paymentBusy, setPaymentBusy] = React.useState(false);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ scope: "all", page: String(page), pageSize: String(pageSize) });
      if (q) p.set("q", q);
      if (sort && sort !== "latest") p.set("sort", sort);
      const res = await fetch(`/api/consultant/leads?${p.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        leads?: LeadRow[];
        total?: number;
        totalPages?: number;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not load leads");
        return;
      }
      setRows(data.leads ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, sort]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function onStatusChange(leadId: string, nextStatus: AdmissionLeadStatus, prevStatus: AdmissionLeadStatus) {
    if (nextStatus === prevStatus) return;
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
      await load();
      router.refresh();
    } finally {
      setBusyLeadId(null);
    }
  }

  async function onMarkPaid(payload: {
    paymentMethod: "UPI" | "CARD";
    upiId?: string;
    cardHolderName?: string;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvv?: string;
  }) {
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
      await load();
      router.refresh();
    } finally {
      setPaymentBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Student leads</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Manage lead status and collect registration payments.
          </p>
        </div>
        {universities.length > 0 ? (
          <Link
            href="/dashboard/university"
            className="inline-flex rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)]"
          >
            Add Lead
          </Link>
        ) : null}
      </div>

      {showAddForm && universities.length > 0 ? (
        <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 px-4 py-3 text-sm text-[var(--foreground-muted)]">
          To add a lead, open a university from{" "}
          <Link href="/dashboard/university" className="font-medium text-[var(--primary)] underline underline-offset-2">
            Your universities
          </Link>{" "}
          and use the lead form on the card.
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {statusError ? <p className="mt-4 text-sm text-red-600">{statusError}</p> : null}

      <ListQueryToolbar
        className="mt-6"
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        q={q}
        sort={sort}
        sortOptions={SORT_LEADS}
        searchPlaceholder="Name, email, or mobile"
        loading={loading}
        itemLabel="lead"
      />

      <section className="mt-4">
        {loading ? (
          <p className="text-sm text-[var(--foreground-muted)]">Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[var(--foreground-muted)]">Name</th>
                  <th className="px-4 py-3 font-semibold text-[var(--foreground-muted)]">Contact</th>
                  <th className="px-4 py-3 font-semibold text-[var(--foreground-muted)]">University</th>
                  <th className="px-4 py-3 font-semibold text-[var(--foreground-muted)]">Stream</th>
                  <th className="px-4 py-3 font-semibold text-[var(--foreground-muted)]">Created</th>
                  <th className="px-4 py-3 font-semibold text-[var(--foreground-muted)]">Status</th>
                  <th className="px-4 py-3 font-semibold text-[var(--foreground-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--foreground-muted)]">
                      No leads yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const name = `${r.firstName} ${r.lastName}`.trim();
                    const canCollect =
                      isReadyToPayStatus(r.admissionStatus) || r.admissionStatus === "PAYMENT_DONE";
                    return (
                      <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">{name}</td>
                        <td className="px-4 py-3">
                          <p className="text-[var(--foreground-muted)]">{r.mobile}</p>
                          <p className="text-xs text-[var(--foreground-muted)]">{r.email}</p>
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground-muted)]">{r.university.name}</td>
                        <td className="px-4 py-3 text-[var(--foreground-muted)]">{r.stream.name}</td>
                        <td className="px-4 py-3 text-xs text-[var(--foreground-muted)]">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={r.admissionStatus}
                            disabled={busyLeadId === r.id}
                            onChange={(e) =>
                              void onStatusChange(r.id, e.target.value as AdmissionLeadStatus, r.admissionStatus)
                            }
                            className="max-w-[12rem] rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs"
                          >
                            {LEAD_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {isReadyToPayStatus(r.admissionStatus) ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentError(null);
                                setPaymentLead(r);
                              }}
                              className="rounded-lg border border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/20"
                            >
                              Collect Payment
                            </button>
                          ) : canCollect && r.admissionStatus === "PAYMENT_DONE" ? (
                            <span className="text-xs text-emerald-700 dark:text-emerald-300">Paid</span>
                          ) : (
                            <span className="text-xs text-[var(--foreground-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PaymentCollectorModal
        open={paymentLead != null}
        leadName={
          paymentLead ? `${paymentLead.firstName} ${paymentLead.lastName}`.trim() || paymentLead.email : ""
        }
        amountLabel={formatInr(paymentLead?.university.registrationFee ?? null)}
        busy={paymentBusy}
        error={paymentError}
        onClose={() => (paymentBusy ? undefined : setPaymentLead(null))}
        onMarkPaid={onMarkPaid}
      />
    </div>
  );
}
