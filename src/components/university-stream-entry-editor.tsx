"use client";

import * as React from "react";
import type { StreamEntry } from "@/lib/stream-entry-payload";
import { createEmptyStreamEntry } from "@/lib/stream-entry-payload";
import type { ProgramCatalogSnapshot } from "@/lib/qspiders-program-catalog";
import {
  degreeTypesForQualification,
  getFallbackProgramCatalog,
  streamsForDegreeType,
} from "@/lib/qspiders-program-catalog";
import type { UniversityProgramLevel } from "@/lib/university-programs";

type UniversityStreamEntryEditorProps = {
  entries: StreamEntry[];
  onChange: (entries: StreamEntry[]) => void;
  catalog: ProgramCatalogSnapshot | null;
  catalogLoading?: boolean;
  targetStudents: string;
  onTargetStudentsChange: (value: string) => void;
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

function selectClass(hasError: boolean) {
  return `mt-0.5 w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm ${
    hasError ? "border-red-500" : "border-[var(--border)]"
  }`;
}

export function UniversityStreamEntryEditor({
  entries,
  onChange,
  catalog,
  catalogLoading,
  targetStudents,
  onTargetStudentsChange,
  disabled,
  fieldErrors = {},
}: UniversityStreamEntryEditorProps) {
  const effectiveCatalog = catalog ?? getFallbackProgramCatalog();
  const qualificationTypes = effectiveCatalog.qualificationTypes;
  const catalogSource = catalog?.source ?? "fallback";

  function updateEntry(id: string, patch: Partial<StreamEntry>) {
    onChange(patchEntry(entries, id, patch));
  }

  function updateQualificationType(id: string, programLevel: UniversityProgramLevel) {
    onChange(
      patchEntry(entries, id, {
        programLevel,
        programName: "",
        streamName: "",
      }),
    );
  }

  function updateDegreeType(id: string, programName: string) {
    onChange(patchEntry(entries, id, { programName, streamName: "" }));
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

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Program details</h2>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Select qualification type, degree type, and stream for each program. Add multiple programs as
            add-ons — e.g. Computer Science, Information Science, Artificial Intelligence.
          </p>
          {catalogLoading ? (
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">Loading program catalog…</p>
          ) : (
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              Catalog source:{" "}
              {catalogSource === "external"
                ? "QSpiders API"
                : catalogSource === "database"
                  ? "Synced catalog"
                  : "Default placeholders until QSpiders API is configured"}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={addEntry}
          disabled={disabled}
          className="shrink-0 text-sm font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
        >
          + Add program
        </button>
      </div>

      <div className="mt-4 max-w-sm">
        <label className="block text-xs font-medium text-[var(--foreground-muted)]">Target students</label>
        <input
          type="text"
          inputMode="numeric"
          value={targetStudents}
          onChange={(e) => onTargetStudentsChange(e.target.value.replace(/\D/g, ""))}
          disabled={disabled}
          placeholder="Applies to all programs"
          aria-invalid={Boolean(fieldErrors.targetStudents)}
          className={`mt-0.5 w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums ${
            fieldErrors.targetStudents ? "border-red-500" : "border-[var(--border)]"
          }`}
        />
        {fieldErrors.targetStudents ? (
          <p className="mt-0.5 text-xs text-red-600">{fieldErrors.targetStudents}</p>
        ) : (
          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
            Overall target student count for this university across all programs.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {entries.map((entry, index) => {
          const degreeOptions = degreeTypesForQualification(effectiveCatalog, entry.programLevel);
          const streamOptions = streamsForDegreeType(
            effectiveCatalog,
            entry.programLevel,
            entry.programName,
          );
          const degreeValid = degreeOptions.some((d) => d.value === entry.programName);
          const selectedStreamOption = streamOptions.find(
            (s) =>
              s.value === entry.streamName ||
              s.label === entry.streamName ||
              s.externalId === entry.streamName,
          );

          return (
            <article
              key={entry.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-3 shadow-sm"
            >
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                  Program {index + 1}
                </span>
                <div className="min-w-[11rem]">
                  <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                    Qualification type <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={entry.programLevel}
                    onChange={(e) => updateQualificationType(entry.id, e.target.value as UniversityProgramLevel)}
                    disabled={disabled || catalogLoading}
                    className={selectClass(false)}
                  >
                    {qualificationTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[9rem]">
                  <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                    Degree type <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={degreeValid ? entry.programName : ""}
                    onChange={(e) => updateDegreeType(entry.id, e.target.value)}
                    disabled={disabled || catalogLoading}
                    aria-invalid={Boolean(fieldErrors[`stream-${entry.id}-program`])}
                    className={selectClass(Boolean(fieldErrors[`stream-${entry.id}-program`]))}
                  >
                    <option value="">Select degree type</option>
                    {degreeOptions.map((program) => (
                      <option key={program.value} value={program.value}>
                        {program.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors[`stream-${entry.id}-program`] ? (
                    <p className="mt-0.5 text-xs text-red-600">{fieldErrors[`stream-${entry.id}-program`]}</p>
                  ) : null}
                </div>
                <div className="min-w-[12rem] flex-1">
                  <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                    Stream <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={selectedStreamOption?.value ?? ""}
                    onChange={(e) => {
                      const selected = streamOptions.find((s) => s.value === e.target.value);
                      updateEntry(entry.id, { streamName: selected?.label ?? e.target.value });
                    }}
                    disabled={disabled || catalogLoading || !entry.programName}
                    aria-invalid={Boolean(fieldErrors[`stream-${entry.id}-stream`])}
                    className={selectClass(Boolean(fieldErrors[`stream-${entry.id}-stream`]))}
                  >
                    <option value="">
                      {entry.programName ? "Select stream" : "Select degree type first"}
                    </option>
                    {streamOptions.map((stream) => (
                      <option key={stream.externalId ?? stream.value} value={stream.value}>
                        {stream.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors[`stream-${entry.id}-stream`] ? (
                    <p className="mt-0.5 text-xs text-red-600">{fieldErrors[`stream-${entry.id}-stream`]}</p>
                  ) : null}
                </div>
                {entries.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    disabled={disabled}
                    className="pb-1.5 text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    Delete program
                  </button>
                ) : null}
              </div>

              <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/10 p-3">
                <h4 className="text-sm font-semibold text-[var(--foreground)]">Seat allocation</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                      Total target seats <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={entry.targetStudents}
                      onChange={(e) =>
                        updateEntry(entry.id, { targetStudents: e.target.value.replace(/\D/g, "") })
                      }
                      disabled={disabled}
                      placeholder="e.g. 120"
                      aria-invalid={Boolean(fieldErrors[`stream-${entry.id}-targetStudents`])}
                      className={feeInputClass(Boolean(fieldErrors[`stream-${entry.id}-targetStudents`]))}
                    />
                    {fieldErrors[`stream-${entry.id}-targetStudents`] ? (
                      <p className="mt-0.5 text-xs text-red-600">
                        {fieldErrors[`stream-${entry.id}-targetStudents`]}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                      CET allocation type <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={entry.cetAllocationMode}
                      disabled={disabled}
                      onChange={(e) =>
                        updateEntry(entry.id, {
                          cetAllocationMode: e.target.value as StreamEntry["cetAllocationMode"],
                          cetAllocationValue: "",
                        })
                      }
                      className={selectClass(false)}
                    >
                      <option value="SEATS">Count</option>
                      <option value="PERCENT">Percentage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                      {entry.cetAllocationMode === "PERCENT"
                        ? "CET percentage"
                        : "CET seats"}{" "}
                      <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode={entry.cetAllocationMode === "PERCENT" ? "decimal" : "numeric"}
                      value={entry.cetAllocationValue}
                      onChange={(e) =>
                        updateEntry(entry.id, {
                          cetAllocationValue:
                            entry.cetAllocationMode === "PERCENT"
                              ? e.target.value.replace(/[^\d.]/g, "")
                              : e.target.value.replace(/\D/g, ""),
                        })
                      }
                      placeholder={entry.cetAllocationMode === "PERCENT" ? "e.g. 25" : "e.g. 40"}
                      disabled={disabled}
                      aria-invalid={Boolean(fieldErrors[`stream-${entry.id}-cet`])}
                      className={feeInputClass(Boolean(fieldErrors[`stream-${entry.id}-cet`]))}
                    />
                    {fieldErrors[`stream-${entry.id}-cet`] ? (
                      <p className="mt-0.5 text-xs text-red-600">{fieldErrors[`stream-${entry.id}-cet`]}</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                        {entry.cetAllocationMode === "PERCENT"
                          ? "Must be between 0 and 100."
                          : "Cannot exceed total target seats."}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/10 p-3">
                <h4 className="text-sm font-semibold text-[var(--foreground)]">Fee structure</h4>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-[var(--foreground-muted)]">5.1 Tuition fee</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                        Annual tuition fee (₹) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entry.tuitionYear1}
                        onChange={(e) =>
                          updateEntry(entry.id, { tuitionYear1: e.target.value.replace(/[^\d.]/g, "") })
                        }
                        disabled={disabled}
                        placeholder="e.g. 150000"
                        aria-invalid={Boolean(fieldErrors[`stream-${entry.id}-tuitionYear1`])}
                        className={feeInputClass(Boolean(fieldErrors[`stream-${entry.id}-tuitionYear1`]))}
                      />
                      {fieldErrors[`stream-${entry.id}-tuitionYear1`] ? (
                        <p className="mt-0.5 text-xs text-red-600">
                          {fieldErrors[`stream-${entry.id}-tuitionYear1`]}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                        Overall package fee (₹)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entry.tuitionTotal}
                        onChange={(e) =>
                          updateEntry(entry.id, { tuitionTotal: e.target.value.replace(/[^\d.]/g, "") })
                        }
                        disabled={disabled}
                        placeholder="e.g. 600000"
                        aria-invalid={Boolean(fieldErrors[`stream-${entry.id}-tuitionTotal`])}
                        className={feeInputClass(Boolean(fieldErrors[`stream-${entry.id}-tuitionTotal`]))}
                      />
                      {fieldErrors[`stream-${entry.id}-tuitionTotal`] ? (
                        <p className="mt-0.5 text-xs text-red-600">
                          {fieldErrors[`stream-${entry.id}-tuitionTotal`]}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-[var(--foreground-muted)]">5.2 Additional fees</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                        Application fee (₹)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={entry.applicationFee}
                        onChange={(e) =>
                          updateEntry(entry.id, {
                            applicationFee: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        disabled={disabled}
                        placeholder="e.g. 500"
                        aria-invalid={Boolean(fieldErrors[`stream-${entry.id}-applicationFee`])}
                        className={feeInputClass(Boolean(fieldErrors[`stream-${entry.id}-applicationFee`]))}
                      />
                      {fieldErrors[`stream-${entry.id}-applicationFee`] ? (
                        <p className="mt-0.5 text-xs text-red-600">
                          {fieldErrors[`stream-${entry.id}-applicationFee`]}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                        Exam fee (₹)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entry.examFee}
                        onChange={(e) =>
                          updateEntry(entry.id, { examFee: e.target.value.replace(/[^\d.]/g, "") })
                        }
                        disabled={disabled}
                        placeholder="e.g. 5000"
                        aria-invalid={Boolean(fieldErrors[`stream-${entry.id}-examFee`])}
                        className={feeInputClass(Boolean(fieldErrors[`stream-${entry.id}-examFee`]))}
                      />
                      {fieldErrors[`stream-${entry.id}-examFee`] ? (
                        <p className="mt-0.5 text-xs text-red-600">{fieldErrors[`stream-${entry.id}-examFee`]}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--foreground-muted)]">
                        Other administrative fee (₹)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entry.otherAdminAmount}
                        onChange={(e) =>
                          updateEntry(entry.id, {
                            otherAdminAmount: e.target.value.replace(/[^\d.]/g, ""),
                          })
                        }
                        disabled={disabled}
                        placeholder="e.g. 2000"
                        aria-invalid={Boolean(fieldErrors[`stream-${entry.id}-otherAdminAmount`])}
                        className={feeInputClass(Boolean(fieldErrors[`stream-${entry.id}-otherAdminAmount`]))}
                      />
                      {fieldErrors[`stream-${entry.id}-otherAdminAmount`] ? (
                        <p className="mt-0.5 text-xs text-red-600">
                          {fieldErrors[`stream-${entry.id}-otherAdminAmount`]}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 max-w-xs">
                <label className="text-xs text-[var(--foreground-muted)]">Registration fee (₹)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={entry.registrationFee}
                  onChange={(e) =>
                    updateEntry(entry.id, {
                      registrationFee: e.target.value.replace(/[^\d.]/g, ""),
                    })
                  }
                  disabled={disabled}
                  className={feeInputClass(Boolean(fieldErrors[`stream-${entry.id}-registrationFee`]))}
                />
                {fieldErrors[`stream-${entry.id}-registrationFee`] ? (
                  <p className="mt-0.5 text-xs text-red-600">
                    {fieldErrors[`stream-${entry.id}-registrationFee`]}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {fieldErrors.streams ? <p className="mt-2 text-sm text-red-600">{fieldErrors.streams}</p> : null}
    </section>
  );
}
