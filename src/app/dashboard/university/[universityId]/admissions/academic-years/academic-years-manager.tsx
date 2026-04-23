"use client";

import Link from "next/link";
import * as React from "react";

export type AcademicYearRow = { id: string; label: string; sortOrder: number };

type Props = {
  universityId: string;
  universityName: string;
  universityCode: string;
  initialYears: AcademicYearRow[];
  /** Master and university staff may create years; admission partners are read-only. */
  canManageYears: boolean;
};

export function AcademicYearsManager({
  universityId,
  universityName,
  universityCode,
  initialYears,
  canManageYears,
}: Props) {
  const [years, setYears] = React.useState(initialYears);
  const [label, setLabel] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/university/${universityId}/academic-years`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = (await res.json()) as { academicYear?: AcademicYearRow; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not add year");
        return;
      }
      if (data.academicYear) {
        setYears((prev) => [...prev, data.academicYear!].sort((a, b) => a.sortOrder - b.sortOrder));
        setLabel("");
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav className="text-sm text-[var(--foreground-muted)]" aria-label="Breadcrumb">
        <Link href="/dashboard/university" className="text-[var(--primary)] underline underline-offset-2">
          Universities
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-[var(--foreground)]">
          {universityName} ({universityCode})
        </span>
      </nav>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Academic years</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        Open a year to see leads and intake metrics. Years also filter the admissions dashboard for university teams.
      </p>

      {canManageYears ? (
        <>
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="year-label" className="block text-sm font-medium text-[var(--foreground)]">
                Add year label
              </label>
              <input
                id="year-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. 2027"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
            >
              {busy ? "Saving…" : "Add year"}
            </button>
          </form>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </>
      ) : null}

      <ul className="mt-8 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        {years.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">No years yet.</li>
        ) : (
          years.map((y) => (
            <li key={y.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <Link
                href={`/dashboard/university/${universityId}/admissions/academic-years/${y.id}`}
                className="font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
              >
                {y.label}
              </Link>
              <span className="text-[var(--foreground-muted)]">Order {y.sortOrder}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
