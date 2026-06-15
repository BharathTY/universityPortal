"use client";

import * as React from "react";
import { ScholarshipType } from "@prisma/client";
import {
  createEmptyScholarshipEntry,
  SCHOLARSHIP_TYPE_OPTIONS,
  type ScholarshipEntry,
} from "@/lib/university-scholarship";

type Props = {
  entries: ScholarshipEntry[];
  onChange: (entries: ScholarshipEntry[]) => void;
  disabled?: boolean;
  fieldErrors?: Record<string, string>;
};

function fieldClass(hasError: boolean) {
  return `mt-0.5 w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm ${
    hasError ? "border-red-500" : "border-[var(--border)]"
  }`;
}

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

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Scholarship details</h2>
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
        {entries.map((entry, index) => (
          <article key={entry.id} className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-medium text-[var(--foreground)]">Scholarship {index + 1}</h3>
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                disabled={disabled}
                className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
              >
                Delete scholarship
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                  Scholarship type <span className="text-red-600">*</span>
                </label>
                <select
                  value={entry.type}
                  disabled={disabled}
                  onChange={(e) =>
                    patchEntry(entry.id, { type: e.target.value as ScholarshipType | "" })
                  }
                  aria-invalid={Boolean(fieldErrors[`scholarship-${entry.id}-type`])}
                  className={fieldClass(Boolean(fieldErrors[`scholarship-${entry.id}-type`]))}
                >
                  <option value="">Select…</option>
                  {SCHOLARSHIP_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors[`scholarship-${entry.id}-type`] ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors[`scholarship-${entry.id}-type`]}</p>
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                  Scholarship value <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={entry.value}
                  disabled={disabled}
                  placeholder="e.g. 50 or 50000"
                  onChange={(e) =>
                    patchEntry(entry.id, { value: e.target.value.replace(/[^\d.]/g, "") })
                  }
                  aria-invalid={Boolean(fieldErrors[`scholarship-${entry.id}-value`])}
                  className={fieldClass(Boolean(fieldErrors[`scholarship-${entry.id}-value`]))}
                />
                {fieldErrors[`scholarship-${entry.id}-value`] ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors[`scholarship-${entry.id}-value`]}</p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
