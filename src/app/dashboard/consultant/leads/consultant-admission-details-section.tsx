"use client";

import * as React from "react";
import { PROGRAM_TYPES } from "@/lib/student-form-options";

export type AdmissionStream = {
  id: string;
  name: string;
  programLevel: "UG" | "PG" | null;
  degreeType: string | null;
};

type UniversityOption = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  universities: UniversityOption[];
  selectedUniversityId: string;
  onUniversityChange: (id: string) => void;
  showUniversityPicker: boolean;
  academicYears: { id: string; label: string }[];
  academicYearId: string;
  onAcademicYearChange: (id: string) => void;
  streams: AdmissionStream[];
  programType: string;
  onProgramTypeChange: (value: string) => void;
  admissionDegreeType: string;
  onAdmissionDegreeTypeChange: (value: string) => void;
  streamId: string;
  onStreamIdChange: (id: string) => void;
  fieldErrors: Record<string, string>;
  borderFor: (key: string) => string;
  clearError: (key: string) => void;
};

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

export function ConsultantAdmissionDetailsSection({
  universities,
  selectedUniversityId,
  onUniversityChange,
  showUniversityPicker,
  academicYears,
  academicYearId,
  onAcademicYearChange,
  streams,
  programType,
  onProgramTypeChange,
  admissionDegreeType,
  onAdmissionDegreeTypeChange,
  streamId,
  onStreamIdChange,
  fieldErrors,
  borderFor,
  clearError,
}: Props) {
  const filteredByLevel = React.useMemo(() => {
    if (!programType) return streams;
    return streams.filter((s) => !s.programLevel || s.programLevel === programType);
  }, [streams, programType]);

  const degreeTypeOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of filteredByLevel) {
      const dt = s.degreeType?.trim();
      if (dt) set.add(dt);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [filteredByLevel]);

  const programOptions = React.useMemo(() => {
    return filteredByLevel.filter((s) => {
      if (!admissionDegreeType) return true;
      return (s.degreeType?.trim() ?? "") === admissionDegreeType;
    });
  }, [filteredByLevel, admissionDegreeType]);

  const selectedUniversity = universities.find((u) => u.id === selectedUniversityId);

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">Admission details</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="University name" required error={fieldErrors.universityId}>
            {showUniversityPicker ? (
              <select
                value={selectedUniversityId}
                onChange={(e) => {
                  onUniversityChange(e.target.value);
                  clearError("universityId");
                }}
                className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("universityId")}`}
              >
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            ) : (
              <input
                readOnly
                value={selectedUniversity ? `${selectedUniversity.name} (${selectedUniversity.code})` : ""}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-[var(--foreground-muted)]"
              />
            )}
          </Field>
        </div>
        <Field label="Academic year" required error={fieldErrors.academicYearId}>
          <select
            value={academicYearId}
            onChange={(e) => {
              onAcademicYearChange(e.target.value);
              clearError("academicYearId");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("academicYearId")}`}
          >
            {academicYears.length === 0 ? <option value="">No years configured</option> : null}
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Program type" required error={fieldErrors.programType}>
          <select
            value={programType}
            onChange={(e) => {
              onProgramTypeChange(e.target.value);
              onAdmissionDegreeTypeChange("");
              onStreamIdChange("");
              clearError("programType");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("programType")}`}
          >
            <option value="">Select program type</option>
            {PROGRAM_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Degree type" required error={fieldErrors.admissionDegreeType}>
          <select
            value={admissionDegreeType}
            onChange={(e) => {
              onAdmissionDegreeTypeChange(e.target.value);
              onStreamIdChange("");
              clearError("admissionDegreeType");
            }}
            disabled={!programType || degreeTypeOptions.length === 0}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 disabled:opacity-60 ${borderFor("admissionDegreeType")}`}
          >
            <option value="">
              {!programType
                ? "Select program type first"
                : degreeTypeOptions.length === 0
                  ? "No degree types configured"
                  : "Select degree type"}
            </option>
            {degreeTypeOptions.map((dt) => (
              <option key={dt} value={dt}>
                {programType === "PG" ? `PG — ${dt}` : `UG — ${dt}`}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Program name" required error={fieldErrors.streamId}>
            <select
              value={streamId}
              onChange={(e) => {
                onStreamIdChange(e.target.value);
                clearError("streamId");
              }}
              disabled={!admissionDegreeType || programOptions.length === 0}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 disabled:opacity-60 ${borderFor("streamId")}`}
            >
              <option value="">
                {!admissionDegreeType
                  ? "Select degree type first"
                  : programOptions.length === 0
                    ? "No programs available"
                    : "Select program name"}
              </option>
              {programOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </section>
  );
}
