"use client";

import * as React from "react";
import {
  createHostelDetailsEntry,
  emptyHostelDetailsDraft,
  formatAcLabel,
  formatHostelFeeDisplay,
  formatHostelTypeLabel,
  formatSharingLabel,
  hostelEntryComboKey,
  hostelEntryToDraft,
  HOSTEL_DETAILS_MESSAGES,
  validateHostelEntryDraft,
  type HostelAcChoice,
  type HostelAvailableChoice,
  type HostelDetailsDraft,
  type HostelDetailsEntry,
  type HostelDetailsState,
  type HostelSharingChoice,
  type HostelTypeChoice,
} from "@/lib/university-hostel-details";

type UniversityHostelDetailsSectionProps = {
  value: HostelDetailsState;
  onChange: (value: HostelDetailsState) => void;
  fieldErrors?: Record<string, string>;
  onClearFieldError?: (key: string) => void;
  disabled?: boolean;
};

function feeInputClass(hasError: boolean) {
  return `mt-0.5 w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums ${
    hasError ? "border-red-500" : "border-[var(--border)]"
  }`;
}

function selectClass(hasError: boolean) {
  return `mt-0.5 w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm ${
    hasError ? "border-red-500" : "border-[var(--border)]"
  }`;
}

function RadioOption({
  name,
  value,
  checked,
  label,
  disabled,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="h-4 w-4 border-[var(--border)] text-[var(--primary)]"
      />
      {label}
    </label>
  );
}

export function UniversityHostelDetailsSection({
  value,
  onChange,
  fieldErrors = {},
  onClearFieldError,
  disabled,
}: UniversityHostelDetailsSectionProps) {
  const showHostelFields = value.hostelAvailable === "YES";
  const [draft, setDraft] = React.useState<HostelDetailsDraft>(() => emptyHostelDetailsDraft());
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftErrors, setDraftErrors] = React.useState<Record<string, string>>({});

  function clearError(key: string) {
    onClearFieldError?.(key);
    setDraftErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function patchDraft(patch: Partial<HostelDetailsDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function onAvailableChange(next: HostelAvailableChoice) {
    setDraft(emptyHostelDetailsDraft());
    setEditingId(null);
    setDraftErrors({});
    if (next === "NO") {
      onChange({ hostelAvailable: next, entries: [] });
    } else {
      onChange({ ...value, hostelAvailable: next });
    }
    clearError("hostelAvailable");
    clearError("hostelEntries");
  }

  function resetDraftForm() {
    setDraft(emptyHostelDetailsDraft());
    setEditingId(null);
    setDraftErrors({});
  }

  function saveHostelEntry() {
    const errors = validateHostelEntryDraft(draft);
    if (Object.keys(errors).length > 0) {
      setDraftErrors(errors);
      return;
    }

    const comboKey = hostelEntryComboKey({
      hostelType: draft.hostelType as Exclude<HostelTypeChoice, "">,
      acType: draft.acType as Exclude<HostelAcChoice, "">,
      sharingType: draft.sharingType as Exclude<HostelSharingChoice, "">,
    });
    const duplicate = value.entries.some(
      (entry) => entry.id !== editingId && hostelEntryComboKey(entry) === comboKey,
    );
    if (duplicate) {
      setDraftErrors({ hostelEntries: HOSTEL_DETAILS_MESSAGES.duplicateEntry });
      return;
    }

    const entry = createHostelDetailsEntry(draft, editingId ?? undefined);
    const entries = editingId
      ? value.entries.map((row) => (row.id === editingId ? entry : row))
      : [...value.entries, entry];

    onChange({ ...value, entries });
    resetDraftForm();
    clearError("hostelEntries");
  }

  function startEdit(entry: HostelDetailsEntry) {
    setDraft(hostelEntryToDraft(entry));
    setEditingId(entry.id);
    setDraftErrors({});
  }

  function removeEntry(id: string) {
    onChange({ ...value, entries: value.entries.filter((entry) => entry.id !== id) });
    if (editingId === id) resetDraftForm();
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Hostel details</h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Fee structure — 5.3 Hostel details. Add one row per hostel type, AC/Non-AC, and sharing combination.
        </p>
      </div>

      <div className="mt-4 max-w-md">
        <label className="block text-sm font-medium text-[var(--foreground)]">
          Hostel available <span className="text-red-600">*</span>
        </label>
        <select
          value={value.hostelAvailable}
          disabled={disabled}
          onChange={(e) => onAvailableChange(e.target.value as HostelAvailableChoice)}
          aria-invalid={Boolean(fieldErrors.hostelAvailable)}
          className={selectClass(Boolean(fieldErrors.hostelAvailable))}
        >
          <option value="">Select…</option>
          <option value="YES">Yes</option>
          <option value="NO">No</option>
        </select>
        {fieldErrors.hostelAvailable ? (
          <p className="mt-0.5 text-xs text-red-600">{fieldErrors.hostelAvailable}</p>
        ) : null}
      </div>

      {showHostelFields ? (
        <>
          <div className="mt-4 space-y-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            {editingId ? (
              <p className="text-xs font-medium text-[var(--primary)]">Editing hostel entry — save to update or cancel.</p>
            ) : null}

            <div className="max-w-md">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Hostel fee per year (₹) <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={draft.feePerYear}
                disabled={disabled}
                placeholder="e.g. 12000"
                onChange={(e) => {
                  patchDraft({ feePerYear: e.target.value.replace(/[^\d.]/g, "") });
                  clearError("hostelFeePerYear");
                }}
                aria-invalid={Boolean(draftErrors.hostelFeePerYear)}
                className={feeInputClass(Boolean(draftErrors.hostelFeePerYear))}
              />
              {draftErrors.hostelFeePerYear ? (
                <p className="mt-0.5 text-xs text-red-600">{draftErrors.hostelFeePerYear}</p>
              ) : null}
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                Hostel type <span className="text-red-600">*</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-4">
                {(
                  [
                    ["BOYS", "Boys hostel"],
                    ["GIRLS", "Girls hostel"],
                    ["BOTH", "Both"],
                  ] as const
                ).map(([option, label]) => (
                  <RadioOption
                    key={option}
                    name="hostelType"
                    value={option}
                    label={label}
                    checked={draft.hostelType === option}
                    disabled={disabled}
                    onChange={(v) => {
                      patchDraft({ hostelType: v as HostelTypeChoice });
                      clearError("hostelType");
                    }}
                  />
                ))}
              </div>
              {draftErrors.hostelType ? (
                <p className="mt-0.5 text-xs text-red-600">{draftErrors.hostelType}</p>
              ) : null}
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                AC / Non-AC <span className="text-red-600">*</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-4">
                {(
                  [
                    ["AC", "AC"],
                    ["NON_AC", "Non-AC"],
                  ] as const
                ).map(([option, label]) => (
                  <RadioOption
                    key={option}
                    name="hostelAcType"
                    value={option}
                    label={label}
                    checked={draft.acType === option}
                    disabled={disabled}
                    onChange={(v) => {
                      patchDraft({ acType: v as HostelAcChoice });
                      clearError("hostelAcType");
                    }}
                  />
                ))}
              </div>
              {draftErrors.hostelAcType ? (
                <p className="mt-0.5 text-xs text-red-600">{draftErrors.hostelAcType}</p>
              ) : null}
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                Sharing type <span className="text-red-600">*</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-4">
                {(
                  [
                    ["1", "1 sharing"],
                    ["2", "2 sharing"],
                    ["3", "3 sharing"],
                    ["4", "4 sharing"],
                  ] as const
                ).map(([option, label]) => (
                  <RadioOption
                    key={option}
                    name="hostelSharingType"
                    value={option}
                    label={label}
                    checked={draft.sharingType === option}
                    disabled={disabled}
                    onChange={(v) => {
                      patchDraft({ sharingType: v as HostelSharingChoice });
                      clearError("hostelSharingType");
                    }}
                  />
                ))}
              </div>
              {draftErrors.hostelSharingType ? (
                <p className="mt-0.5 text-xs text-red-600">{draftErrors.hostelSharingType}</p>
              ) : null}
            </div>

            <div className="max-w-md">
              <label className="block text-sm font-medium text-[var(--foreground)]">Food fee (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                value={draft.foodFee}
                disabled={disabled}
                placeholder="Optional"
                onChange={(e) => {
                  patchDraft({ foodFee: e.target.value.replace(/[^\d.]/g, "") });
                  clearError("hostelFoodFee");
                }}
                aria-invalid={Boolean(draftErrors.hostelFoodFee)}
                className={feeInputClass(Boolean(draftErrors.hostelFoodFee))}
              />
              {draftErrors.hostelFoodFee ? (
                <p className="mt-0.5 text-xs text-red-600">{draftErrors.hostelFoodFee}</p>
              ) : (
                <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">Optional — annual food fee.</p>
              )}
            </div>

            {draftErrors.hostelEntries ? (
              <p className="text-xs text-red-600">{draftErrors.hostelEntries}</p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={disabled}
                onClick={saveHostelEntry}
                className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
              >
                {editingId ? "Update hostel details" : "Save hostel details"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={resetDraftForm}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted)]/50 disabled:opacity-50"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>

          {fieldErrors.hostelEntries ? (
            <p className="mt-3 text-sm text-red-600">{fieldErrors.hostelEntries}</p>
          ) : null}

          {value.entries.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold text-[var(--foreground)]">Hostel fee per year (₹)</th>
                    <th className="px-3 py-2.5 font-semibold text-[var(--foreground)]">Hostel type</th>
                    <th className="px-3 py-2.5 font-semibold text-[var(--foreground)]">AC/Non-AC</th>
                    <th className="px-3 py-2.5 font-semibold text-[var(--foreground)]">Sharing type</th>
                    <th className="px-3 py-2.5 font-semibold text-[var(--foreground)]">Food fee (₹)</th>
                    <th className="px-3 py-2.5 font-semibold text-[var(--foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {value.entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-3 py-2.5 tabular-nums">{formatHostelFeeDisplay(entry.feePerYear)}</td>
                      <td className="px-3 py-2.5">{formatHostelTypeLabel(entry.hostelType)}</td>
                      <td className="px-3 py-2.5">{formatAcLabel(entry.acType)}</td>
                      <td className="px-3 py-2.5">{formatSharingLabel(entry.sharingType)}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {entry.foodFee.trim() ? formatHostelFeeDisplay(entry.foodFee) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => startEdit(entry)}
                            className="text-[var(--primary)] hover:underline disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => removeEntry(entry.id)}
                            className="text-red-600 hover:underline disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--foreground-muted)]">
              No hostel fee structures added yet. Fill in the form above and click Save hostel details.
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
