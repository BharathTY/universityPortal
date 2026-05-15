"use client";

import Link from "next/link";
import * as React from "react";
import {
  buildSelectableYopYears,
  isSelectableYopYear,
  maxSelectableYopYear,
  minSelectableYopYear,
} from "@/lib/academic-year-yop";

export type AcademicYearRow = { id: string; label: string; sortOrder: number };

type Props = {
  universityId: string;
  universityName: string;
  universityCode: string;
  /** Master list vs scoped university hub. */
  universitiesListHref: string;
  initialYears: AcademicYearRow[];
  /** Master and university staff may create years; admission partners are read-only. */
  canManageYears: boolean;
};

export function AcademicYearsManager({
  universityId,
  universityName,
  universityCode,
  universitiesListHref,
  initialYears,
  canManageYears,
}: Props) {
  const [years, setYears] = React.useState(initialYears);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const yopMin = minSelectableYopYear();
  const yopMax = maxSelectableYopYear();
  const allYearOptions = React.useMemo(() => buildSelectableYopYears(), []);
  const existingLabels = React.useMemo(() => new Set(years.map((y) => y.label)), [years]);
  const availableYearOptions = React.useMemo(
    () => allYearOptions.filter((y) => !existingLabels.has(String(y))),
    [allYearOptions, existingLabels],
  );

  React.useEffect(() => {
    if (!selectedYear) return;
    if (!availableYearOptions.includes(Number(selectedYear))) {
      setSelectedYear(availableYearOptions[0] ? String(availableYearOptions[0]) : "");
    }
  }, [availableYearOptions, selectedYear]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const label = selectedYear.trim();
    if (!label || !/^\d{4}$/.test(label)) {
      setError("Select an academic year");
      return;
    }
    const n = Number(label);
    if (!isSelectableYopYear(n)) {
      setError(`Select a year from ${yopMin} to ${yopMax} (past years are not available)`);
      return;
    }
    if (years.some((y) => y.label === label)) {
      setError(`Academic year ${label} is already added`);
      return;
    }
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
        setSelectedYear("");
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
        <Link href={universitiesListHref} className="text-[var(--primary)] underline underline-offset-2">
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
              <label htmlFor="yop-year" className="block text-sm font-medium text-[var(--foreground)]">
                Academic year
              </label>
              <select
                id="yop-year"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setError(null);
                }}
                required
                disabled={availableYearOptions.length === 0}
                className={`mt-1 w-full max-w-xs rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${error ? "border-red-500" : "border-[var(--border)]"}`}
                aria-invalid={Boolean(error)}
                aria-describedby="yop-year-hint"
              >
                <option value="" disabled>
                  {availableYearOptions.length === 0 ? "All years added" : "Select year"}
                </option>
                {availableYearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              <p id="yop-year-hint" className="mt-1 text-xs text-[var(--foreground-muted)]">
                Choose the intake year only — {yopMin} through {yopMax}. Past years (e.g.{" "}
                {yopMin - 1}) are not listed.
              </p>
            </div>
            <button
              type="submit"
              disabled={busy || !selectedYear || availableYearOptions.length === 0}
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
            <li key={y.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/university/${universityId}/admissions/academic-years/${y.id}`}
                  className="font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                >
                  {y.label}
                </Link>
                <Link
                  href={`/dashboard/university/${universityId}/admissions?year=${encodeURIComponent(y.id)}`}
                  className="mt-0.5 block text-xs text-[var(--foreground-muted)] underline-offset-2 hover:underline"
                >
                  View admissions
                </Link>
              </div>
              <span className="shrink-0 text-[var(--foreground-muted)]">Order {y.sortOrder}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
