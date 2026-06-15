"use client";

import * as React from "react";
import type {
  HostelAcChoice,
  HostelAvailableChoice,
  HostelDetailsForm,
  HostelSharingChoice,
  HostelTypeChoice,
} from "@/lib/university-hostel-details";

type UniversityHostelDetailsSectionProps = {
  value: HostelDetailsForm;
  onChange: (value: HostelDetailsForm) => void;
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

  function patch(patch: Partial<HostelDetailsForm>) {
    onChange({ ...value, ...patch });
  }

  function clearError(key: string) {
    onClearFieldError?.(key);
  }

  function onAvailableChange(next: HostelAvailableChoice) {
    if (next === "NO") {
      onChange({
        hostelAvailable: next,
        feePerYear: "",
        hostelType: "",
        acType: "",
        sharingType: "",
        foodFee: "",
      });
    } else {
      patch({ hostelAvailable: next });
    }
    clearError("hostelAvailable");
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Hostel details</h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Fee structure — 5.3 Hostel details (shared across programs).
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
        <div className="mt-4 space-y-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Hostel fee per year (₹) <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={value.feePerYear}
              disabled={disabled}
              placeholder="e.g. 120000"
              onChange={(e) => {
                patch({ feePerYear: e.target.value.replace(/[^\d.]/g, "") });
                clearError("hostelFeePerYear");
              }}
              aria-invalid={Boolean(fieldErrors.hostelFeePerYear)}
              className={feeInputClass(Boolean(fieldErrors.hostelFeePerYear))}
            />
            {fieldErrors.hostelFeePerYear ? (
              <p className="mt-0.5 text-xs text-red-600">{fieldErrors.hostelFeePerYear}</p>
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
                  checked={value.hostelType === option}
                  disabled={disabled}
                  onChange={(v) => {
                    patch({ hostelType: v as HostelTypeChoice });
                    clearError("hostelType");
                  }}
                />
              ))}
            </div>
            {fieldErrors.hostelType ? (
              <p className="mt-0.5 text-xs text-red-600">{fieldErrors.hostelType}</p>
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
                  checked={value.acType === option}
                  disabled={disabled}
                  onChange={(v) => {
                    patch({ acType: v as HostelAcChoice });
                    clearError("hostelAcType");
                  }}
                />
              ))}
            </div>
            {fieldErrors.hostelAcType ? (
              <p className="mt-0.5 text-xs text-red-600">{fieldErrors.hostelAcType}</p>
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
                  checked={value.sharingType === option}
                  disabled={disabled}
                  onChange={(v) => {
                    patch({ sharingType: v as HostelSharingChoice });
                    clearError("hostelSharingType");
                  }}
                />
              ))}
            </div>
            {fieldErrors.hostelSharingType ? (
              <p className="mt-0.5 text-xs text-red-600">{fieldErrors.hostelSharingType}</p>
            ) : null}
          </div>

          <div className="max-w-md">
            <label className="block text-sm font-medium text-[var(--foreground)]">Food fee (₹)</label>
            <input
              type="text"
              inputMode="decimal"
              value={value.foodFee}
              disabled={disabled}
              placeholder="Optional"
              onChange={(e) => {
                patch({ foodFee: e.target.value.replace(/[^\d.]/g, "") });
                clearError("hostelFoodFee");
              }}
              aria-invalid={Boolean(fieldErrors.hostelFoodFee)}
              className={feeInputClass(Boolean(fieldErrors.hostelFoodFee))}
            />
            {fieldErrors.hostelFoodFee ? (
              <p className="mt-0.5 text-xs text-red-600">{fieldErrors.hostelFoodFee}</p>
            ) : (
              <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">Optional — annual food fee.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
