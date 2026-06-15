"use client";

import * as React from "react";
import {
  createEmptyUniversitySpocDraft,
  isUniversitySpocRowComplete,
  stripUniversityPhoneInput,
  universitySpocFieldKey,
  type UniversitySpocDraft,
} from "@/lib/university-spoc";

type UniversitySpocEditorProps = {
  rows: UniversitySpocDraft[];
  onChange: (rows: UniversitySpocDraft[]) => void;
  fieldErrors: Record<string, string>;
  onClearFieldError: (key: string) => void;
  disabled?: boolean;
};

function borderFor(fieldErrors: Record<string, string>, key: string) {
  return fieldErrors[key] ? "border-red-500" : "border-[var(--border)]";
}

export function UniversitySpocEditor({
  rows,
  onChange,
  fieldErrors,
  onClearFieldError,
  disabled,
}: UniversitySpocEditorProps) {
  function updateRow(id: string, patch: Partial<UniversitySpocDraft>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    onChange([...rows, createEmptyUniversitySpocDraft()]);
  }

  function removeRow(id: string) {
    onChange(rows.length <= 1 ? rows : rows.filter((r) => r.id !== id));
  }

  const tableRows = rows.filter(isUniversitySpocRowComplete);

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">University SPOC details</h2>
        <p className="text-xs text-[var(--foreground-muted)]">All fields are required for each SPOC.</p>
      </div>

      <div className="mt-4 space-y-4">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-[var(--foreground)]">SPOC {index + 1}</h3>
              {rows.length > 1 ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeRow(row.id)}
                  className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  SPOC name <span className="text-red-600">*</span>
                </label>
                <input
                  value={row.name}
                  disabled={disabled}
                  onChange={(e) => {
                    updateRow(row.id, { name: e.target.value });
                    onClearFieldError(universitySpocFieldKey(index, "name", rows.length));
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, universitySpocFieldKey(index, "name", rows.length))}`}
                />
                {fieldErrors[universitySpocFieldKey(index, "name", rows.length)] ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[universitySpocFieldKey(index, "name", rows.length)]}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Designation <span className="text-red-600">*</span>
                </label>
                <input
                  value={row.designation}
                  disabled={disabled}
                  placeholder="e.g. Admissions Director"
                  onChange={(e) => {
                    updateRow(row.id, { designation: e.target.value });
                    onClearFieldError(universitySpocFieldKey(index, "designation", rows.length));
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, universitySpocFieldKey(index, "designation", rows.length))}`}
                />
                {fieldErrors[universitySpocFieldKey(index, "designation", rows.length)] ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[universitySpocFieldKey(index, "designation", rows.length)]}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Mobile number <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  disabled={disabled}
                  value={row.mobile}
                  onChange={(e) => {
                    updateRow(row.id, { mobile: stripUniversityPhoneInput(e.target.value) });
                    onClearFieldError(universitySpocFieldKey(index, "mobile", rows.length));
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, universitySpocFieldKey(index, "mobile", rows.length))}`}
                />
                {fieldErrors[universitySpocFieldKey(index, "mobile", rows.length)] ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[universitySpocFieldKey(index, "mobile", rows.length)]}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">Must be 10 digits.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Email ID <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  disabled={disabled}
                  value={row.email}
                  placeholder="name@university.edu"
                  onChange={(e) => {
                    updateRow(row.id, { email: e.target.value });
                    onClearFieldError(universitySpocFieldKey(index, "email", rows.length));
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, universitySpocFieldKey(index, "email", rows.length))}`}
                />
                {fieldErrors[universitySpocFieldKey(index, "email", rows.length)] ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[universitySpocFieldKey(index, "email", rows.length)]}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">Enter a valid email ID.</p>
                )}
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          disabled={disabled}
          onClick={addRow}
          className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
        >
          + Add SPOC
        </button>
      </div>

      {tableRows.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Added SPOCs</h3>
          <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                <tr>
                  <th className="px-3 py-2.5 font-semibold text-[var(--foreground)]">#</th>
                  <th className="px-3 py-2.5 font-semibold text-[var(--foreground)]">SPOC name</th>
                  <th className="px-3 py-2.5 font-semibold text-[var(--foreground)]">Designation</th>
                  <th className="px-3 py-2.5 font-semibold text-[var(--foreground)]">Mobile number</th>
                  <th className="px-3 py-2.5 font-semibold text-[var(--foreground)]">Email ID</th>
                  <th className="px-3 py-2.5 font-semibold text-[var(--foreground)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, index) => (
                  <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-2.5 tabular-nums text-[var(--foreground-muted)]">{index + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-[var(--foreground)]">{row.name.trim()}</td>
                    <td className="px-3 py-2.5">{row.designation.trim()}</td>
                    <td className="px-3 py-2.5 tabular-nums">{row.mobile.trim()}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2.5" title={row.email.trim()}>
                      {row.email.trim()}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        disabled={disabled || rows.length <= 1}
                        onClick={() => removeRow(row.id)}
                        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
