"use client";

import * as React from "react";
import { INDIAN_STATES_AND_UT } from "@/lib/indian-states";
import {
  HIGHER_QUALIFICATION_TYPES,
  SSLC_BOARDS,
  SSLC_RESULT_TYPES,
  STUDENT_CATEGORIES,
  STUDENT_GENDERS,
  STUDENT_TITLES,
} from "@/lib/student-form-options";
import { PHOTO_UPLOAD_GUIDELINES, type EntranceExamFormRow, type StudentProfilePrefill } from "@/lib/student-lead-prefill";
import { createEmptyEntranceExamRow } from "@/app/dashboard/consultant/leads/consultant-optional-education-sections";
import { inputClass } from "@/components/student/student-portal-ui";

type Props = {
  profile: StudentProfilePrefill;
  onChange: (patch: Partial<StudentProfilePrefill>) => void;
  fieldErrors: Record<string, string>;
  onPhotoUpload: (file: File) => Promise<void>;
  photoUploading?: boolean;
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
      <label className="text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[var(--border)] pt-6 first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function StudentProfileForm({ profile: p, onChange, fieldErrors, onPhotoUpload, photoUploading }: Props) {
  const fullName = [p.firstName.trim(), p.lastName.trim()].filter(Boolean).join(" ");

  function updateExam(clientId: string, patch: Partial<EntranceExamFormRow>) {
    onChange({
      entranceExams: p.entranceExams.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row)),
    });
  }

  return (
    <div className="space-y-6">
      <Section title="Student personal details">
        <Field label="Student title">
          <select value={p.studentTitle} onChange={(e) => onChange({ studentTitle: e.target.value })} className={inputClass}>
            <option value="">Select</option>
            {STUDENT_TITLES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="First name" required error={fieldErrors.firstName}>
          <input value={p.firstName} onChange={(e) => onChange({ firstName: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Last name" required error={fieldErrors.lastName}>
          <input value={p.lastName} onChange={(e) => onChange({ lastName: e.target.value })} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Full name">
            <input readOnly value={fullName} className={`${inputClass} bg-[var(--muted)]/40`} />
          </Field>
        </div>
        <Field label="Gender" required error={fieldErrors.gender}>
          <select value={p.gender} onChange={(e) => onChange({ gender: e.target.value })} className={inputClass}>
            <option value="">Select</option>
            {STUDENT_GENDERS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Date of birth" required error={fieldErrors.dateOfBirth}>
          <input type="date" value={p.dateOfBirth} onChange={(e) => onChange({ dateOfBirth: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Category">
          <select value={p.category} onChange={(e) => onChange({ category: e.target.value })} className={inputClass}>
            <option value="">Select</option>
            {STUDENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Caste"><input value={p.caste} onChange={(e) => onChange({ caste: e.target.value })} className={inputClass} /></Field>
        <Field label="Religion"><input value={p.religion} onChange={(e) => onChange({ religion: e.target.value })} className={inputClass} /></Field>
        <Field label="Nationality" required error={fieldErrors.nationality}>
          <input value={p.nationality} onChange={(e) => onChange({ nationality: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Mobile number" required error={fieldErrors.mobile}>
          <input value={p.mobile} onChange={(e) => onChange({ mobile: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Parent / guardian name">
          <input value={p.guardianName} onChange={(e) => onChange({ guardianName: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Parent / guardian mobile">
          <input value={p.guardianMobile} onChange={(e) => onChange({ guardianMobile: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Email address">
          <input readOnly value={p.email} className={`${inputClass} bg-[var(--muted)]/40`} />
        </Field>
        <Field label="UIDAI number"><input value={p.uidaiNumber} onChange={(e) => onChange({ uidaiNumber: e.target.value })} className={inputClass} /></Field>
        <Field label="ABC ID / APAAR ID"><input value={p.abcApaarId} onChange={(e) => onChange({ abcApaarId: e.target.value })} className={inputClass} /></Field>
        <Field label="State">
          <select value={p.admissionState} onChange={(e) => onChange({ admissionState: e.target.value })} className={inputClass}>
            <option value="">Select state</option>
            {INDIAN_STATES_AND_UT.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Student photograph" required error={fieldErrors.photoUrl}>
            <ul className="mt-1 list-inside list-disc text-xs text-[var(--foreground-muted)]">
              {PHOTO_UPLOAD_GUIDELINES.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
            {p.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photoUrl} alt="Student" className="mt-2 h-24 w-24 rounded-lg border object-cover" />
            ) : null}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={photoUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onPhotoUpload(file);
              }}
              className="mt-2 block w-full text-sm"
            />
          </Field>
        </div>
      </Section>

      <Section title="Address details">
        <div className="sm:col-span-2">
          <Field label="Address line 1"><input value={p.addressLine1} onChange={(e) => onChange({ addressLine1: e.target.value })} className={inputClass} /></Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Address line 2"><input value={p.addressLine2} onChange={(e) => onChange({ addressLine2: e.target.value })} className={inputClass} /></Field>
        </div>
        <Field label="City"><input value={p.city} onChange={(e) => onChange({ city: e.target.value })} className={inputClass} /></Field>
        <Field label="District"><input value={p.district} onChange={(e) => onChange({ district: e.target.value })} className={inputClass} /></Field>
        <Field label="State">
          <select value={p.state} onChange={(e) => onChange({ state: e.target.value })} className={inputClass}>
            <option value="">Select state</option>
            {INDIAN_STATES_AND_UT.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Country"><input value={p.country} onChange={(e) => onChange({ country: e.target.value })} className={inputClass} /></Field>
        <Field label="PIN code"><input value={p.pincode} onChange={(e) => onChange({ pincode: e.target.value })} className={inputClass} /></Field>
        <div className="sm:col-span-2">
          <Field label="Correspondence address">
            <textarea value={p.correspondenceAddress} onChange={(e) => onChange({ correspondenceAddress: e.target.value })} rows={2} className={inputClass} />
          </Field>
        </div>
      </Section>

      <Section title="Academic details — 10th standard">
        <Field label="School name" required error={fieldErrors.sslcSchool}>
          <input value={p.sslcSchool} onChange={(e) => onChange({ sslcSchool: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Board name" required error={fieldErrors.sslcBoard}>
          <select value={p.sslcBoard} onChange={(e) => onChange({ sslcBoard: e.target.value })} className={inputClass}>
            <option value="">Select board</option>
            {SSLC_BOARDS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Year of passing" required error={fieldErrors.sslcYear}>
          <input value={p.sslcYear} onChange={(e) => onChange({ sslcYear: e.target.value.replace(/\D/g, "").slice(0, 4) })} className={inputClass} />
        </Field>
        <Field label="Result type" required error={fieldErrors.sslcResultType}>
          <select value={p.sslcResultType} onChange={(e) => onChange({ sslcResultType: e.target.value })} className={inputClass}>
            <option value="">Select</option>
            {SSLC_RESULT_TYPES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </Field>
        <Field label={p.sslcResultType === "CGPA" ? "CGPA" : "Percentage (%)"} required error={fieldErrors.sslcPercent}>
          <input value={p.sslcPercent} onChange={(e) => onChange({ sslcPercent: e.target.value })} className={inputClass} />
        </Field>
        {p.sslcMarksCardUrl ? (
          <div className="sm:col-span-2">
            <a href={p.sslcMarksCardUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--primary)] underline">
              View 10th marks card uploaded by consultant
            </a>
          </div>
        ) : null}
      </Section>

      <Section title="Academic details — 12th / ITI / Diploma">
        <Field label="Qualification type" required error={fieldErrors.qualificationType}>
          <select value={p.qualificationType} onChange={(e) => onChange({ qualificationType: e.target.value })} className={inputClass}>
            <option value="">Select</option>
            {HIGHER_QUALIFICATION_TYPES.map((q) => (
              <option key={q.value} value={q.value}>{q.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Institution name" required error={fieldErrors.qualInstitution}>
          <input value={p.qualInstitution} onChange={(e) => onChange({ qualInstitution: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Board / university name" required error={fieldErrors.qualBoardUniversity}>
          <input value={p.qualBoardUniversity} onChange={(e) => onChange({ qualBoardUniversity: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Year of passing" required error={fieldErrors.qualYear}>
          <input value={p.qualYear} onChange={(e) => onChange({ qualYear: e.target.value.replace(/\D/g, "").slice(0, 4) })} className={inputClass} />
        </Field>
        <Field label="Result type" required error={fieldErrors.qualResultType}>
          <select value={p.qualResultType} onChange={(e) => onChange({ qualResultType: e.target.value })} className={inputClass}>
            <option value="">Select</option>
            {SSLC_RESULT_TYPES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </Field>
        <Field label={p.qualResultType === "CGPA" ? "CGPA" : "Percentage (%)"} required error={fieldErrors.qualScore}>
          <input value={p.qualScore} onChange={(e) => onChange({ qualScore: e.target.value })} className={inputClass} />
        </Field>
        {p.qualMarksCardUrl ? (
          <div className="sm:col-span-2">
            <a href={p.qualMarksCardUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--primary)] underline">
              View qualification marks card uploaded by consultant
            </a>
          </div>
        ) : null}
      </Section>

      <Section title="Admission details">
        <Field label="University name">
          <input readOnly value={p.universityName} className={`${inputClass} bg-[var(--muted)]/40`} />
        </Field>
        <Field label="Academic year">
          <input readOnly value={p.academicYear} className={`${inputClass} bg-[var(--muted)]/40`} />
        </Field>
        <Field label="Program type" required error={fieldErrors.programType}>
          <input readOnly value={p.programType === "PG" ? "Postgraduate (PG)" : p.programType === "UG" ? "Undergraduate (UG)" : p.programType} className={`${inputClass} bg-[var(--muted)]/40`} />
        </Field>
        <Field label="Degree type" required error={fieldErrors.degreeType}>
          <input readOnly value={p.degreeType} className={`${inputClass} bg-[var(--muted)]/40`} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Program name" required error={fieldErrors.programName}>
            <input readOnly value={p.programName} className={`${inputClass} bg-[var(--muted)]/40`} />
          </Field>
        </div>
      </Section>

      <Section title="Other educational details (optional)">
          <Field label="Degree type"><input value={p.priorDegreeType} onChange={(e) => onChange({ priorDegreeType: e.target.value })} className={inputClass} /></Field>
          <Field label="Degree name"><input value={p.priorDegreeName} onChange={(e) => onChange({ priorDegreeName: e.target.value })} className={inputClass} /></Field>
          <Field label="Stream / specialization"><input value={p.priorDegreeStream} onChange={(e) => onChange({ priorDegreeStream: e.target.value })} className={inputClass} /></Field>
          <Field label="College name"><input value={p.priorDegreeCollege} onChange={(e) => onChange({ priorDegreeCollege: e.target.value })} className={inputClass} /></Field>
          <Field label="University name"><input value={p.priorDegreeUniversity} onChange={(e) => onChange({ priorDegreeUniversity: e.target.value })} className={inputClass} /></Field>
          <Field label="Year of passing"><input value={p.priorDegreeYear} onChange={(e) => onChange({ priorDegreeYear: e.target.value })} className={inputClass} /></Field>
          <Field label="Result type">
            <select value={p.priorDegreeResultType} onChange={(e) => onChange({ priorDegreeResultType: e.target.value })} className={inputClass}>
              <option value="">Select</option>
              {SSLC_RESULT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Percentage / CGPA"><input value={p.priorDegreeScore} onChange={(e) => onChange({ priorDegreeScore: e.target.value })} className={inputClass} /></Field>
      </Section>

      <div className="border-t border-[var(--border)] pt-6">
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={p.hasEntranceExams}
            onChange={(e) => {
              const checked = e.target.checked;
              onChange({
                hasEntranceExams: checked,
                entranceExams: checked && p.entranceExams.length === 0 ? [createEmptyEntranceExamRow()] : p.entranceExams,
              });
            }}
            className="mt-0.5"
          />
          <span className="text-sm">I have appeared for any other entrance examination</span>
        </label>
        {p.hasEntranceExams ? (
          <div className="mt-4 space-y-4">
            {p.entranceExams.map((exam, index) => (
              <div key={exam.clientId} className="rounded-lg border border-[var(--border)] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Examination {index + 1}</p>
                  {p.entranceExams.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onChange({ entranceExams: p.entranceExams.filter((r) => r.clientId !== exam.clientId) })}
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Examination name" error={fieldErrors[`entranceExams.${index}.examName`]}>
                    <input value={exam.examName} onChange={(e) => updateExam(exam.clientId, { examName: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Examination centre name" error={fieldErrors[`entranceExams.${index}.centreName`]}>
                    <input value={exam.centreName} onChange={(e) => updateExam(exam.clientId, { centreName: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Registration / hall ticket number">
                    <input value={exam.registrationNumber} onChange={(e) => updateExam(exam.clientId, { registrationNumber: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Score / rank obtained" error={fieldErrors[`entranceExams.${index}.scoreRank`]}>
                    <input value={exam.scoreRank} onChange={(e) => updateExam(exam.clientId, { scoreRank: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Year of examination" error={fieldErrors[`entranceExams.${index}.examYear`]}>
                    <input value={exam.examYear} onChange={(e) => updateExam(exam.clientId, { examYear: e.target.value.replace(/\D/g, "").slice(0, 4) })} className={inputClass} />
                  </Field>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange({ entranceExams: [...p.entranceExams, createEmptyEntranceExamRow()] })}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium"
            >
              + Add another examination
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
