"use client";

import * as React from "react";
import { SSLC_RESULT_TYPES } from "@/lib/student-form-options";
import { newClientId } from "@/lib/client-id";
import {
  educationScoreInputAttrs,
  sanitizeEducationScoreInput,
} from "@/lib/education-score-validation";

export type PriorDegreeFormValues = {
  priorDegreeType: string;
  priorDegreeName: string;
  priorDegreeStream: string;
  priorDegreeCollege: string;
  priorDegreeUniversity: string;
  priorDegreeYear: string;
  priorDegreeResultType: string;
  priorDegreeScore: string;
};

export type EntranceExamFormRow = {
  clientId: string;
  examName: string;
  centreName: string;
  registrationNumber: string;
  scoreRank: string;
  examYear: string;
};

export function createEmptyPriorDegreeValues(): PriorDegreeFormValues {
  return {
    priorDegreeType: "",
    priorDegreeName: "",
    priorDegreeStream: "",
    priorDegreeCollege: "",
    priorDegreeUniversity: "",
    priorDegreeYear: "",
    priorDegreeResultType: "",
    priorDegreeScore: "",
  };
}

export function createEmptyEntranceExamRow(): EntranceExamFormRow {
  return {
    clientId: newClientId("exam"),
    examName: "",
    centreName: "",
    registrationNumber: "",
    scoreRank: "",
    examYear: "",
  };
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-[var(--foreground)]">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

type PriorProps = {
  values: PriorDegreeFormValues;
  onChange: <K extends keyof PriorDegreeFormValues>(key: K, value: PriorDegreeFormValues[K]) => void;
  fieldErrors: Record<string, string>;
  borderFor: (key: string) => string;
  clearError: (key: string) => void;
};

export function ConsultantOtherEducationSection({
  values: v,
  onChange,
  fieldErrors,
  borderFor,
  clearError,
}: PriorProps) {
  const scoreLabel = v.priorDegreeResultType === "CGPA" ? "CGPA" : "Percentage (%)";

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">Other educational details (optional)</h3>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">
        If the student has completed a degree program, enter those details below. All fields are optional.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Degree type" error={fieldErrors.priorDegreeType}>
          <input
            value={v.priorDegreeType}
            onChange={(e) => {
              onChange("priorDegreeType", e.target.value);
              clearError("priorDegreeType");
            }}
            placeholder="e.g. Bachelor's, B.Tech, M.Sc."
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("priorDegreeType")}`}
          />
        </Field>
        <Field label="Degree name" error={fieldErrors.priorDegreeName}>
          <input
            value={v.priorDegreeName}
            onChange={(e) => {
              onChange("priorDegreeName", e.target.value);
              clearError("priorDegreeName");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("priorDegreeName")}`}
          />
        </Field>
        <Field label="Stream / specialization" error={fieldErrors.priorDegreeStream}>
          <input
            value={v.priorDegreeStream}
            onChange={(e) => {
              onChange("priorDegreeStream", e.target.value);
              clearError("priorDegreeStream");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("priorDegreeStream")}`}
          />
        </Field>
        <Field label="College name" error={fieldErrors.priorDegreeCollege}>
          <input
            value={v.priorDegreeCollege}
            onChange={(e) => {
              onChange("priorDegreeCollege", e.target.value);
              clearError("priorDegreeCollege");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("priorDegreeCollege")}`}
          />
        </Field>
        <Field label="University name" error={fieldErrors.priorDegreeUniversity}>
          <input
            value={v.priorDegreeUniversity}
            onChange={(e) => {
              onChange("priorDegreeUniversity", e.target.value);
              clearError("priorDegreeUniversity");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("priorDegreeUniversity")}`}
          />
        </Field>
        <Field label="Year of passing (YOP)" error={fieldErrors.priorDegreeYear}>
          <input
            value={v.priorDegreeYear}
            onChange={(e) => {
              onChange("priorDegreeYear", e.target.value.replace(/\D/g, "").slice(0, 4));
              clearError("priorDegreeYear");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("priorDegreeYear")}`}
          />
        </Field>
        <Field label="Result type" error={fieldErrors.priorDegreeResultType}>
          <select
            value={v.priorDegreeResultType}
            onChange={(e) => {
              onChange("priorDegreeResultType", e.target.value);
              clearError("priorDegreeResultType");
              clearError("priorDegreeScore");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("priorDegreeResultType")}`}
          >
            <option value="">Select result type</option>
            {SSLC_RESULT_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={scoreLabel} error={fieldErrors.priorDegreeScore}>
          <input
            type="text"
            inputMode={educationScoreInputAttrs(v.priorDegreeResultType).inputMode}
            value={v.priorDegreeScore}
            onChange={(e) => {
              onChange("priorDegreeScore", sanitizeEducationScoreInput(e.target.value));
              clearError("priorDegreeScore");
            }}
            placeholder={
              v.priorDegreeResultType === "CGPA"
                ? "0 – 10"
                : v.priorDegreeResultType === "PERCENTAGE"
                  ? "35 – 100"
                  : undefined
            }
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("priorDegreeScore")}`}
          />
        </Field>
      </div>
    </section>
  );
}

type EntranceProps = {
  hasEntranceExams: boolean;
  onHasEntranceExamsChange: (checked: boolean) => void;
  exams: EntranceExamFormRow[];
  onExamsChange: (exams: EntranceExamFormRow[]) => void;
  fieldErrors: Record<string, string>;
  borderFor: (key: string) => string;
  clearError: (key: string) => void;
};

export function ConsultantEntranceExamsSection({
  hasEntranceExams,
  onHasEntranceExamsChange,
  exams,
  onExamsChange,
  fieldErrors,
  borderFor,
  clearError,
}: EntranceProps) {
  function updateExam(clientId: string, patch: Partial<EntranceExamFormRow>) {
    onExamsChange(exams.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row)));
  }

  function addExam() {
    onExamsChange([...exams, createEmptyEntranceExamRow()]);
  }

  function removeExam(clientId: string) {
    onExamsChange(exams.filter((row) => row.clientId !== clientId));
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">
        Additional qualification / entrance examination details
      </h3>
      <label className="mt-4 flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={hasEntranceExams}
          onChange={(e) => {
            const checked = e.target.checked;
            onHasEntranceExamsChange(checked);
            clearError("entranceExams");
            if (checked && exams.length === 0) {
              onExamsChange([createEmptyEntranceExamRow()]);
            }
          }}
          className="mt-0.5"
        />
        <span className="text-sm text-[var(--foreground)]">I have appeared for any other entrance examination</span>
      </label>
      {fieldErrors.entranceExams ? (
        <p className="mt-2 text-xs text-red-600">{fieldErrors.entranceExams}</p>
      ) : null}

      {hasEntranceExams ? (
        <div className="mt-4 space-y-6">
          {exams.map((exam, index) => (
            <div
              key={exam.clientId}
              className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-[var(--foreground)]">Examination {index + 1}</h4>
                {exams.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeExam(exam.clientId)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Examination name" required error={fieldErrors[`entranceExams.${index}.examName`]}>
                  <input
                    value={exam.examName}
                    onChange={(e) => {
                      updateExam(exam.clientId, { examName: e.target.value });
                      clearError(`entranceExams.${index}.examName`);
                      clearError("entranceExams");
                    }}
                    className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(`entranceExams.${index}.examName`)}`}
                  />
                </Field>
                <Field label="Score / rank obtained" required error={fieldErrors[`entranceExams.${index}.scoreRank`]}>
                  <input
                    value={exam.scoreRank}
                    onChange={(e) => {
                      updateExam(exam.clientId, { scoreRank: e.target.value });
                      clearError(`entranceExams.${index}.scoreRank`);
                      clearError("entranceExams");
                    }}
                    className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(`entranceExams.${index}.scoreRank`)}`}
                  />
                </Field>
                <Field label="Year of examination" required error={fieldErrors[`entranceExams.${index}.examYear`]}>
                  <input
                    value={exam.examYear}
                    onChange={(e) => {
                      updateExam(exam.clientId, { examYear: e.target.value.replace(/\D/g, "").slice(0, 4) });
                      clearError(`entranceExams.${index}.examYear`);
                      clearError("entranceExams");
                    }}
                    className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(`entranceExams.${index}.examYear`)}`}
                  />
                </Field>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addExam}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/40"
          >
            + Add another examination
          </button>
        </div>
      ) : null}
    </section>
  );
}
