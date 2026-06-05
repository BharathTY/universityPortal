"use client";

import * as React from "react";
import { HostelGender, HostelRoomType, HostelSharing } from "@prisma/client";
import type { HostelFeesForm, StreamEntry } from "@/lib/stream-entry-payload";
import { createEmptyStreamEntry } from "@/lib/stream-entry-payload";
import {
  comboForSelection,
  HOSTEL_FEE_COMBOS,
  type HostelFeeKey,
  type HostelSelection,
} from "@/lib/hostel-fee-matrix";
import {
  isValidProgramForLevel,
  programsForLevel,
  UNIVERSITY_PROGRAM_LEVEL_OPTIONS,
  type UniversityProgramLevel,
} from "@/lib/university-programs";

type UniversityStreamEntryEditorProps = {
  entries: StreamEntry[];
  onChange: (entries: StreamEntry[]) => void;
  hostelFees: HostelFeesForm;
  onHostelChange: (fees: HostelFeesForm) => void;
  targetStudentsUg: string;
  targetStudentsPg: string;
  onTargetStudentsUgChange: (value: string) => void;
  onTargetStudentsPgChange: (value: string) => void;
  foodFee: string;
  onFoodFeeChange: (value: string) => void;
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
  targetStudentsUg,
  targetStudentsPg,
  onTargetStudentsUgChange,
  onTargetStudentsPgChange,
  foodFee,
  onFoodFeeChange,
  disabled,
  fieldErrors = {},
}: UniversityStreamEntryEditorProps) {
  const [hostelOpen, setHostelOpen] = React.useState(false);
  const [hostelSelection, setHostelSelection] = React.useState<HostelSelection>({
    gender: HostelGender.GIRLS,
    roomType: HostelRoomType.AC,
    sharing: HostelSharing.SINGLE,
  });

  const activeHostelCombo = comboForSelection(hostelSelection);
  const activeHostelKey = activeHostelCombo?.key;

  function updateEntry(id: string, patch: Partial<StreamEntry>) {
    onChange(patchEntry(entries, id, patch));
  }

  function updateProgramLevel(id: string, programLevel: UniversityProgramLevel) {
    onChange(
      patchEntry(entries, id, {
        programLevel,
        programName: "",
        streamName: "",
      }),
    );
  }

  function updateProgramName(id: string, programName: string) {
    onChange(patchEntry(entries, id, { programName }));
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

  function setHostelField(key: HostelFeeKey, value: string) {
    onHostelChange({ ...hostelFees, [key]: value });
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">UG &amp; PG streams</h2>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Select program category and program, then enter each stream. Add multiple entries — e.g. Computer
            Science, Information Science, Finance, Marketing.
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

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-[var(--foreground-muted)]">Target students (UG)</label>
          <input
            type="text"
            inputMode="numeric"
            value={targetStudentsUg}
            onChange={(e) => onTargetStudentsUgChange(e.target.value.replace(/\D/g, ""))}
            disabled={disabled}
            className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--foreground-muted)]">Target students (PG)</label>
          <input
            type="text"
            inputMode="numeric"
            value={targetStudentsPg}
            onChange={(e) => onTargetStudentsPgChange(e.target.value.replace(/\D/g, ""))}
            disabled={disabled}
            className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--foreground-muted)]">Food fee</label>
          <input
            type="text"
            inputMode="decimal"
            value={foodFee}
            onChange={(e) => onFoodFeeChange(e.target.value.replace(/[^\d.]/g, ""))}
            disabled={disabled}
            className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums"
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {entries.map((entry, index) => (
          <article
            key={entry.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-3 shadow-sm"
          >
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                Stream {index + 1}
              </span>
              <div className="min-w-[11rem]">
                <label className="block text-xs font-medium text-[var(--foreground-muted)]">Program category</label>
                <select
                  value={entry.programLevel}
                  onChange={(e) => updateProgramLevel(entry.id, e.target.value as UniversityProgramLevel)}
                  disabled={disabled}
                  className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm font-medium"
                >
                  {UNIVERSITY_PROGRAM_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[9rem]">
                <label className="block text-xs font-medium text-[var(--foreground-muted)]">Program</label>
                <select
                  value={isValidProgramForLevel(entry.programLevel, entry.programName) ? entry.programName : ""}
                  onChange={(e) => updateProgramName(entry.id, e.target.value)}
                  disabled={disabled}
                  aria-invalid={Boolean(fieldErrors[`stream-${entry.id}-program`])}
                  className={`mt-0.5 w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm ${
                    fieldErrors[`stream-${entry.id}-program`] ? "border-red-500" : "border-[var(--border)]"
                  }`}
                >
                  <option value="">Select program</option>
                  {programsForLevel(entry.programLevel).map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
                {fieldErrors[`stream-${entry.id}-program`] ? (
                  <p className="mt-0.5 text-xs text-red-600">{fieldErrors[`stream-${entry.id}-program`]}</p>
                ) : null}
              </div>
              <div className="min-w-[12rem] flex-1">
                <label className="block text-xs font-medium text-[var(--foreground-muted)]">Stream</label>
                <input
                  value={entry.streamName}
                  onChange={(e) => updateEntry(entry.id, { streamName: e.target.value })}
                  disabled={disabled}
                  placeholder="e.g. Computer Science, Finance"
                  aria-invalid={Boolean(fieldErrors[`stream-${entry.id}-stream`])}
                  className={`mt-0.5 w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm ${
                    fieldErrors[`stream-${entry.id}-stream`] ? "border-red-500" : "border-[var(--border)]"
                  }`}
                />
                {fieldErrors[`stream-${entry.id}-stream`] ? (
                  <p className="mt-0.5 text-xs text-red-600">{fieldErrors[`stream-${entry.id}-stream`]}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                disabled={disabled}
                className="pb-1.5 text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-8">
              {(
                [
                  ["Target students", "targetStudents", false],
                  ["Annual tuition", "tuitionYear1", true],
                  ["Program package", "tuitionTotal", true],
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

            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={entry.hasOtherAdmin}
                  disabled={disabled}
                  onChange={(e) =>
                    updateEntry(entry.id, {
                      hasOtherAdmin: e.target.checked,
                      ...(e.target.checked ? {} : { otherAdminCharges: "", otherAdminAmount: "" }),
                    })
                  }
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                Additional administrative charges
              </label>
              {entry.hasOtherAdmin ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
                  <div>
                    <label className="text-xs text-[var(--foreground-muted)]">Charge name</label>
                    <input
                      value={entry.otherAdminCharges}
                      onChange={(e) => updateEntry(entry.id, { otherAdminCharges: e.target.value })}
                      disabled={disabled}
                      className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--foreground-muted)]">Charge amount</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={entry.otherAdminAmount}
                      onChange={(e) =>
                        updateEntry(entry.id, { otherAdminAmount: e.target.value.replace(/[^\d.]/g, "") })
                      }
                      disabled={disabled}
                      className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums"
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-2">
              <label className="text-xs text-[var(--foreground-muted)]">CET allocation</label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <select
                  value={entry.cetAllocationMode}
                  disabled={disabled}
                  onChange={(e) =>
                    updateEntry(entry.id, {
                      cetAllocationMode: e.target.value as StreamEntry["cetAllocationMode"],
                    })
                  }
                  className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
                >
                  <option value="SEATS">Seat count</option>
                  <option value="PERCENT">Percentage of intake</option>
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  value={entry.cetAllocationValue}
                  onChange={(e) =>
                    updateEntry(entry.id, {
                      cetAllocationValue: e.target.value.replace(/[^\d.]/g, ""),
                    })
                  }
                  placeholder={entry.cetAllocationMode === "PERCENT" ? "e.g. 25" : "e.g. 40"}
                  disabled={disabled}
                  className={`w-full max-w-[10rem] rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums ${
                    fieldErrors[`stream-${entry.id}-cet`] ? "border-red-500" : "border-[var(--border)]"
                  }`}
                />
                <span className="text-xs text-[var(--foreground-muted)]">
                  {entry.cetAllocationMode === "PERCENT" ? "% of target students" : "seats"}
                </span>
              </div>
              {fieldErrors[`stream-${entry.id}-cet`] ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors[`stream-${entry.id}-cet`]}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {fieldErrors.streams ? <p className="mt-2 text-sm text-red-600">{fieldErrors.streams}</p> : null}

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
            <p className="text-xs text-[var(--foreground-muted)]">
              Boys/Girls × AC/Non-AC × Single/Double/Triple/Four sharing — select a combination to enter annual fee.
            </p>
            <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_14rem]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] border-collapse text-xs">
                  <thead>
                    <tr className="text-left text-[var(--foreground-muted)]">
                      <th className="pb-2 pr-2 font-medium">Hostel</th>
                      <th className="pb-2 px-1 font-medium">AC</th>
                      <th className="pb-2 px-1 font-medium">Non-AC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        { gender: HostelGender.GIRLS, label: "Girls" },
                        { gender: HostelGender.BOYS, label: "Boys" },
                      ] as const
                    ).map(({ gender, label }) => (
                      <React.Fragment key={gender}>
                        {(
                          [
                            { sharing: HostelSharing.SINGLE, sharingLabel: "Single" },
                            { sharing: HostelSharing.TWO_SHARING, sharingLabel: "Double" },
                            { sharing: HostelSharing.TRIPLE, sharingLabel: "Triple" },
                            { sharing: HostelSharing.FOUR_SHARING, sharingLabel: "Four" },
                          ] as const
                        ).map(({ sharing, sharingLabel }) => (
                          <tr key={`${gender}-${sharing}`} className="border-t border-[var(--border)]/60">
                            <td className="py-1.5 pr-2 text-[var(--foreground)]">
                              {label} · {sharingLabel}
                            </td>
                            {([HostelRoomType.AC, HostelRoomType.NON_AC] as const).map((roomType) => {
                              const combo = comboForSelection({ gender, roomType, sharing });
                              const selected =
                                hostelSelection.gender === gender &&
                                hostelSelection.roomType === roomType &&
                                hostelSelection.sharing === sharing;
                              const hasValue = combo ? hostelFees[combo.key].trim().length > 0 : false;
                              return (
                                <td key={roomType} className="px-1 py-1.5">
                                  <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => setHostelSelection({ gender, roomType, sharing })}
                                    className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
                                      selected
                                        ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 font-medium text-[var(--foreground)]"
                                        : hasValue
                                          ? "border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground)]"
                                          : "border-dashed border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--muted)]/20"
                                    }`}
                                  >
                                    {hasValue && combo ? `₹${hostelFees[combo.key]}` : "Set fee"}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {activeHostelKey && activeHostelCombo ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <p className="text-xs font-medium text-[var(--foreground)]">
                    {activeHostelCombo.genderLabel} · {activeHostelCombo.roomLabel} ·{" "}
                    {activeHostelCombo.sharingLabel}
                  </p>
                  <label className="mt-2 block text-xs text-[var(--foreground-muted)]">Annual fee (₹)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={hostelFees[activeHostelKey]}
                    onChange={(e) => setHostelField(activeHostelKey, e.target.value.replace(/[^\d.]/g, ""))}
                    disabled={disabled}
                    className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums"
                  />
                  <p className="mt-2 text-[10px] text-[var(--foreground-muted)]">
                    {HOSTEL_FEE_COMBOS.filter((c) => hostelFees[c.key].trim().length > 0).length} of{" "}
                    {HOSTEL_FEE_COMBOS.length} combinations filled
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
