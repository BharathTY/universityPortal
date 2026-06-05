"use client";

import * as React from "react";
import { ScholarshipType } from "@prisma/client";
import {
  createEmptyScholarshipEntry,
  type ScholarshipEntry,
} from "@/lib/university-scholarship";

type Props = {
  entries: ScholarshipEntry[];
  onChange: (entries: ScholarshipEntry[]) => void;
  disabled?: boolean;
  fieldErrors?: Record<string, string>;
};

export function UniversityScholarshipEditor({ entries, onChange, disabled, fieldErrors = {} }: Props) {
  function patchEntry(id: string, patch: Partial<ScholarshipEntry>) {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function addEntry() {
    onChange([...entries, createEmptyScholarshipEntry()]);
  }

  function removeEntry(id: string) {
    if (entries.length <= 1) {
      onChange([createEmptyScholarshipEntry()]);
      return;
    }
    onChange(entries.filter((e) => e.id !== id));
  }

  function updateCriterion(entryId: string, index: number, value: string) {
    onChange(
      entries.map((e) => {
        if (e.id !== entryId) return e;
        const criteria = [...e.criteria];
        criteria[index] = value;
        return { ...e, criteria };
      }),
    );
  }

  function addCriterion(entryId: string) {
    onChange(
      entries.map((e) => (e.id === entryId ? { ...e, criteria: [...e.criteria, ""] } : e)),
    );
  }

  function removeCriterion(entryId: string, index: number) {
    onChange(
      entries.map((e) => {
        if (e.id !== entryId) return e;
        const criteria = e.criteria.filter((_, i) => i !== index);
        return { ...e, criteria: criteria.length > 0 ? criteria : [""] };
      }),
    );
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Scholarships</h2>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Scholarships apply to tuition fees only — not registration, hostel, food, exam, or other charges.
          </p>
        </div>
        <button
          type="button"
          onClick={addEntry}
          disabled={disabled}
          className="shrink-0 text-sm font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
        >
          + Add scholarship
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {entries.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-medium text-[var(--foreground)]">Scholarship</h3>
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                disabled={disabled}
                className="text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr]">
              <div>
                <label className="text-xs text-[var(--foreground-muted)]">Type</label>
                <select
                  value={entry.type}
                  disabled={disabled}
                  onChange={(e) =>
                    patchEntry(entry.id, { type: e.target.value as ScholarshipType })
                  }
                  className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
                >
                  <option value={ScholarshipType.PERCENTAGE}>Percentage off tuition</option>
                  <option value={ScholarshipType.FIXED_AMOUNT}>Fixed amount off tuition</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--foreground-muted)]">
                  {entry.type === ScholarshipType.PERCENTAGE ? "Percentage (%)" : "Amount (₹)"}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={entry.value}
                  disabled={disabled}
                  onChange={(e) =>
                    patchEntry(entry.id, { value: e.target.value.replace(/[^\d.]/g, "") })
                  }
                  className={`mt-0.5 w-full max-w-[12rem] rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums ${
                    fieldErrors[`scholarship-${entry.id}-value`] ? "border-red-500" : "border-[var(--border)]"
                  }`}
                />
                {fieldErrors[`scholarship-${entry.id}-value`] ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors[`scholarship-${entry.id}-value`]}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-[var(--foreground-muted)]">
                Eligibility criteria
              </label>
              <div className="mt-2 space-y-2">
                {entry.criteria.map((criterion, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={criterion}
                      disabled={disabled}
                      onChange={(e) => updateCriterion(entry.id, i, e.target.value)}
                      placeholder="e.g. 90%+ in 12th board exams"
                      className="flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
                    />
                    {entry.criteria.length > 1 ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => removeCriterion(entry.id, i)}
                        className="shrink-0 text-xs text-[var(--foreground-muted)] hover:text-red-600"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => addCriterion(entry.id)}
                className="mt-2 text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
              >
                + Add criterion
              </button>
              {fieldErrors[`scholarship-${entry.id}-criteria`] ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors[`scholarship-${entry.id}-criteria`]}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
