"use client";

import * as React from "react";
import { UniversitySelector } from "@/components/student/student-portal-ui";
import { formatDateTime, formatInr } from "@/lib/student-portal";

type AppListItem = {
  id: string;
  universityName: string;
  programmeName: string;
};

type FeesData = {
  applicationId: string;
  programme: {
    universityName: string;
    stream: string;
    intakeMonth: string;
    academicYear: string;
  };
  breakdown: { label: string; amount: number | null; highlight?: boolean }[];
  transactions: {
    transactionRef: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
};

export default function StudentFeesPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [applications, setApplications] = React.useState<AppListItem[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [fees, setFees] = React.useState<FeesData | null>(null);

  async function loadFees(appId?: string) {
    setLoading(true);
    setError(null);
    try {
      let list: AppListItem[] = applications;
      if (!appId && applications.length === 0) {
        const appRes = await fetch("/api/student/application");
        const appJson = (await appRes.json().catch(() => ({}))) as { applications?: AppListItem[] };
        list = appJson.applications ?? [];
        setApplications(list);
      }

      const id = appId ?? list[0]?.id;
      if (!id) {
        setFees(null);
        return;
      }

      setSelectedId(id);
      const res = await fetch(`/api/student/fees?applicationId=${encodeURIComponent(id)}`);
      const data = (await res.json().catch(() => ({}))) as FeesData & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not load fees");
        return;
      }
      setFees(data);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-[var(--foreground-muted)]">Loading…</p>
      </div>
    );
  }

  if (!fees) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Fees &amp; Payment</h1>
        <p className="mt-4 text-sm text-[var(--foreground-muted)]">No fee information is available yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Fees &amp; Payment</h1>

      <div className="mt-4">
        <UniversitySelector
          applications={applications}
          selectedId={selectedId}
          onChange={(id) => void loadFees(id)}
        />
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Programme info</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[var(--foreground-muted)]">University</dt>
            <dd className="font-medium">{fees.programme.universityName}</dd>
          </div>
          <div>
            <dt className="text-[var(--foreground-muted)]">Course stream</dt>
            <dd className="font-medium">{fees.programme.stream}</dd>
          </div>
          <div>
            <dt className="text-[var(--foreground-muted)]">Intake month</dt>
            <dd className="font-medium">{fees.programme.intakeMonth}</dd>
          </div>
          <div>
            <dt className="text-[var(--foreground-muted)]">Academic year</dt>
            <dd className="font-medium">{fees.programme.academicYear}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <h2 className="border-b border-[var(--border)] px-6 py-4 text-lg font-semibold">Fee breakdown</h2>
        <table className="w-full text-sm">
          <tbody>
            {fees.breakdown.map((row) => (
              <tr key={row.label} className={row.highlight ? "bg-[var(--muted)]/30 font-semibold" : ""}>
                <td className="px-6 py-3 text-[var(--foreground-muted)]">{row.label}</td>
                <td className="px-6 py-3 text-right tabular-nums">{formatInr(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <h2 className="border-b border-[var(--border)] px-6 py-4 text-lg font-semibold">Transaction history</h2>
        {fees.transactions.length === 0 ? (
          <p className="px-6 py-8 text-sm text-[var(--foreground-muted)]">No transactions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--foreground-muted)]">
                <th className="px-6 py-3 font-medium">Transaction ref</th>
                <th className="px-6 py-3 font-medium">Date / time</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {fees.transactions.map((tx) => (
                <tr key={tx.transactionRef} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-6 py-3 font-mono text-xs">{tx.transactionRef}</td>
                  <td className="px-6 py-3">{formatDateTime(tx.createdAt)}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{formatInr(tx.amount)}</td>
                  <td className="px-6 py-3">
                    <span
                      className={
                        tx.status === "SUCCESS"
                          ? "text-emerald-600"
                          : tx.status === "FAILED"
                            ? "text-red-600"
                            : "text-[var(--foreground-muted)]"
                      }
                    >
                      {tx.status === "SUCCESS" ? "Success" : tx.status === "FAILED" ? "Failed" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
