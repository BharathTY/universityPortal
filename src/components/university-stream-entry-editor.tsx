"use client";

import * as React from "react";
import type { HostelFeesForm, StreamEntry } from "@/lib/stream-entry-payload";
import { createEmptyStreamEntry } from "@/lib/stream-entry-payload";

type UniversityStreamEntryEditorProps = {
  entries: StreamEntry[];
  onChange: (entries: StreamEntry[]) => void;
  hostelFees: HostelFeesForm;
  onHostelChange: (fees: HostelFeesForm) => void;
  disabled?: boolean;
  fieldErrors?: Record<string, string>;
};

function feeInputClass(hasError: boolean) {
  return `mt-0.5 w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums ${
    hasError ? "border-red-500" : "border-[var(--border)]"
  }`;
}

function patchEntry(entries: StreamEntry[], id: string, patch: Partial<StreamEntry>): StreamEntry[] {
  return entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
}

export function UniversityStreamEntryEditor({
  entries,
  onChange,
  hostelFees,
  onHostelChange,
  disabled,
  fieldErrors = {},
}: UniversityStreamEntryEditorProps) {
  const [hostelOpen, setHostelOpen] = React.useState(false);

  function updateEntry(id: string, patch: Partial<StreamEntry>) {
    onChange(patchEntry(entries, id, patch));
  }

  function removeEntry(id: string) {
    if (entries.length <= 1) {
      onChange([createEmptyStreamEntry()]);
      return;
    }
    onChange(entries.filter((e) => e.id !== id));
  }

  function addEntry() {
    onChange([...entries, createEmptyStreamEntry()]);
  }

  function setHostelField(key: keyof HostelFeesForm, value: string) {
    onHostelChange({ ...hostelFees, [key]: value });
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Programs, fees &amp; seats</h2>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Add one card per stream — UG/PG, fees, and CET seats together.
          </p>
        </div>
        <button
          type="button"
          onClick={addEntry}
          disabled={disabled}
          className="shrink-0 text-sm font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
        >
          + Add stream
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {entries.map((entry, index) => (
          <article
            key={entry.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-3 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                Stream {index + 1}
              </span>
              <select
                value={entry.programLevel}
                onChange={(e) => updateEntry(entry.id, { programLevel: e.target.value as "UG" | "PG" })}
                disabled={disabled}
                className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm font-medium"
              >
                <option value="UG">UG</option>
                <option value="PG">PG</option>
              </select>
              <input
                value={entry.streamName}
                onChange={(e) => updateEntry(entry.id, { streamName: e.target.value })}
                placeholder="e.g. B.Tech CSE, MBA"
                disabled={disabled}
                className="min-w-[12rem] flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                disabled={disabled}
                className="text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  ["Target students", "targetStudents", false],
                  ["Registration", "registrationFee", true],
                  ["Application", "applicationFee", true],
                  ["Mess", "messFee", true],
                  ["Exam", "examFee", true],
                  ["Other admin", "otherAdminAmount", true],
                ] as const
              ).map(([label, key, isFee]) => {
                const errKey = `stream-${entry.id}-${key}`;
                const hasError = Boolean(fieldErrors[errKey]);
                return (
                  <div key={key}>
                    <label className="text-xs text-[var(--foreground-muted)]">{label}</label>
                    <input
                      type="text"
                      inputMode={isFee ? "decimal" : "numeric"}
                      value={entry[key]}
                      onChange={(e) =>
                        updateEntry(entry.id, {
                          [key]: isFee ? e.target.value.replace(/[^\d.]/g, "") : e.target.value.replace(/\D/g, ""),
                        })
                      }
                      disabled={disabled}
                      className={feeInputClass(hasError)}
                    />
                    {hasError ? <p className="mt-0.5 text-xs text-red-600">{fieldErrors[errKey]}</p> : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_7rem]">
              <div>
                <label className="text-xs text-[var(--foreground-muted)]">Other admin charges (description)</label>
                <input
                  value={entry.otherAdminCharges}
                  onChange={(e) => updateEntry(entry.id, { otherAdminCharges: e.target.value })}
                  disabled={disabled}
                  className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--foreground-muted)]">CET seats</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={entry.cetSeats}
                  onChange={(e) => updateEntry(entry.id, { cetSeats: e.target.value.replace(/\D/g, "") })}
                  placeholder="Seats"
                  disabled={disabled}
                  className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums"
                />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20">
        <button
          type="button"
          onClick={() => setHostelOpen((o) => !o)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-[var(--foreground)]"
        >
          <span>Hostel fee matrix (shared across streams)</span>
          <span className="text-[var(--foreground-muted)]">{hostelOpen ? "▲" : "▼"}</span>
        </button>
        {hostelOpen ? (
          <div className="border-t border-[var(--border)] px-3 pb-3 pt-2">
            <p className="text-xs text-[var(--foreground-muted)]">AC / Non-AC × 2-sharing / 4-sharing (annual)</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["Girls", [
                    ["AC · 2-sharing", "girlsAc2"],
                    ["AC · 4-sharing", "girlsAc4"],
                    ["Non-AC · 2-sharing", "girlsNonAc2"],
                    ["Non-AC · 4-sharing", "girlsNonAc4"],
                  ]],
                  ["Boys", [
                    ["AC · 2-sharing", "boysAc2"],
                    ["AC · 4-sharing", "boysAc4"],
                    ["Non-AC · 2-sharing", "boysNonAc2"],
                    ["Non-AC · 4-sharing", "boysNonAc4"],
                  ]],
                ] as const
              ).map(([gender, fields]) => (
                <div key={gender}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">{gender}</h3>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {fields.map(([label, key]) => (
                      <div key={key}>
                        <label className="text-xs text-[var(--foreground-muted)]">{label}</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={hostelFees[key]}
                          onChange={(e) => setHostelField(key, e.target.value.replace(/[^\d.]/g, ""))}
                          disabled={disabled}
                          className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
