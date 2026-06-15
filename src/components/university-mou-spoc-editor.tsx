"use client";

import * as React from "react";
import {
  createEmptyUniversityMouSpocDraft,
  mouSpocFieldKey,
  stripUniversityPhoneInput,
  type UniversityMouSpocDraft,
} from "@/lib/university-mou-spoc";

type UniversityMouSpocEditorProps = {
  rows: UniversityMouSpocDraft[];
  onChange: (rows: UniversityMouSpocDraft[]) => void;
  fieldErrors: Record<string, string>;
  onClearFieldError: (key: string) => void;
  disabled?: boolean;
};

function borderFor(fieldErrors: Record<string, string>, key: string) {
  return fieldErrors[key] ? "border-red-500" : "border-[var(--border)]";
}

export function UniversityMouSpocEditor({
  rows,
  onChange,
  fieldErrors,
  onClearFieldError,
  disabled,
}: UniversityMouSpocEditorProps) {
  function updateRow(id: string, patch: Partial<UniversityMouSpocDraft>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    onChange([...rows, createEmptyUniversityMouSpocDraft()]);
  }

  function removeRow(id: string) {
    onChange(rows.length <= 1 ? rows : rows.filter((r) => r.id !== id));
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">MOU SPOC details</h2>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            Consultant SPOC contacts for the MOU. These details are sent to the Sheshu sir team when the university is
            created.
          </p>
        </div>
        <p className="text-xs text-[var(--foreground-muted)]">All fields are required for each SPOC.</p>
      </div>

      <div className="mt-4 space-y-4">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-[var(--foreground)]">MOU SPOC {index + 1}</h3>
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
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  value={row.name}
                  disabled={disabled}
                  onChange={(e) => {
                    updateRow(row.id, { name: e.target.value });
                    onClearFieldError(mouSpocFieldKey(index, "name", rows.length));
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, mouSpocFieldKey(index, "name", rows.length))}`}
                />
                {fieldErrors[mouSpocFieldKey(index, "name", rows.length)] ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[mouSpocFieldKey(index, "name", rows.length)]}
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
                  placeholder="e.g. Consultant SPOC"
                  onChange={(e) => {
                    updateRow(row.id, { designation: e.target.value });
                    onClearFieldError(mouSpocFieldKey(index, "designation", rows.length));
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, mouSpocFieldKey(index, "designation", rows.length))}`}
                />
                {fieldErrors[mouSpocFieldKey(index, "designation", rows.length)] ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[mouSpocFieldKey(index, "designation", rows.length)]}
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
                    onClearFieldError(mouSpocFieldKey(index, "mobile", rows.length));
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, mouSpocFieldKey(index, "mobile", rows.length))}`}
                />
                {fieldErrors[mouSpocFieldKey(index, "mobile", rows.length)] ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[mouSpocFieldKey(index, "mobile", rows.length)]}
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
                  placeholder="name@consultant.com"
                  onChange={(e) => {
                    updateRow(row.id, { email: e.target.value });
                    onClearFieldError(mouSpocFieldKey(index, "email", rows.length));
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, mouSpocFieldKey(index, "email", rows.length))}`}
                />
                {fieldErrors[mouSpocFieldKey(index, "email", rows.length)] ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[mouSpocFieldKey(index, "email", rows.length)]}
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
    </section>
  );
}
