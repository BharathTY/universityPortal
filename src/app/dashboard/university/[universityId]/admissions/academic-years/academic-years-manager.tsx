"use client";

import Link from "next/link";
import * as React from "react";

export type AcademicYearRow = { id: string; label: string; sortOrder: number };

const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

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

/** Parse `YYYY-MM-DD` from a date input value and return the four-digit year string. */
function yearFromDateValue(iso: string): string | null {
  if (!iso || iso.length < 4) return null;
  const y = iso.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

export function AcademicYearsManager({
  universityId,
  universityName,
  universityCode,
  universitiesListHref,
  initialYears,
  canManageYears,
}: Props) {
  const [years, setYears] = React.useState(initialYears);
  /** Controlled value for `<input type="date">` (normalized to `YYYY-01-01` for the chosen year). */
  const [dateValue, setDateValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const minDate = `${YEAR_MIN}-01-01`;
  const maxDate = `${YEAR_MAX}-12-31`;

  function onDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (!v) {
      setDateValue("");
      setError(null);
      return;
    }
    const year = v.slice(0, 4);
    if (!/^\d{4}$/.test(year)) return;
    setDateValue(`${year}-01-01`);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const label = yearFromDateValue(dateValue);
    if (!label) {
      setError("Select a year from the calendar");
      return;
    }
    const n = Number(label);
    if (n < YEAR_MIN || n > YEAR_MAX) {
      setError(`Year must be between ${YEAR_MIN} and ${YEAR_MAX}`);
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
        setDateValue("");
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
              <label htmlFor="year-picker" className="block text-sm font-medium text-[var(--foreground)]">
                Academic year
              </label>
              <input
                id="year-picker"
                type="date"
                value={dateValue}
                onChange={onDateChange}
                min={minDate}
                max={maxDate}
                required
                className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${error ? "border-red-500" : "border-[var(--border)]"}`}
                aria-invalid={Boolean(error)}
                aria-describedby="year-picker-hint"
              />
              <p id="year-picker-hint" className="mt-1 text-xs text-[var(--foreground-muted)]">
                Use the calendar to pick any day in the intake year; we save the four-digit year only (e.g. 2027). Only
                numeric years between {YEAR_MIN} and {YEAR_MAX} are allowed.
              </p>
            </div>
            <button
              type="submit"
              disabled={busy || !dateValue}
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
