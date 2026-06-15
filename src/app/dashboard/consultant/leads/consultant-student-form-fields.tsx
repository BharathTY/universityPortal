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

export type ConsultantStudentFormValues = {
  studentTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  gender: string;
  dateOfBirth: string;
  category: string;
  caste: string;
  religion: string;
  nationality: string;
  guardianName: string;
  guardianMobile: string;
  uidaiNumber: string;
  abcApaarId: string;
  admissionState: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
  correspondenceAddress: string;
  sslcSchool: string;
  sslcBoard: string;
  sslcYear: string;
  sslcResultType: string;
  sslcPercent: string;
  qualificationType: string;
  qualInstitution: string;
  qualBoardUniversity: string;
  qualYear: string;
  qualResultType: string;
  qualScore: string;
};

type Props = {
  values: ConsultantStudentFormValues;
  onChange: <K extends keyof ConsultantStudentFormValues>(key: K, value: ConsultantStudentFormValues[K]) => void;
  fieldErrors: Record<string, string>;
  borderFor: (key: string) => string;
  clearError: (key: string) => void;
  isEdit: boolean;
  photoPreview: string | null;
  existingPhotoUrl: string | null;
  photoFile: File | null;
  onPhotoChange: (file: File | null) => void;
  sslcMarksCardFile: File | null;
  existingSslcMarksCardUrl: string | null;
  onSslcMarksCardChange: (file: File | null) => void;
  qualMarksCardFile: File | null;
  existingQualMarksCardUrl: string | null;
  onQualMarksCardChange: (file: File | null) => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
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

export function ConsultantStudentFormFields({
  values: v,
  onChange,
  fieldErrors,
  borderFor,
  clearError,
  isEdit,
  photoPreview,
  existingPhotoUrl,
  photoFile,
  onPhotoChange,
  sslcMarksCardFile,
  existingSslcMarksCardUrl,
  onSslcMarksCardChange,
  qualMarksCardFile,
  existingQualMarksCardUrl,
  onQualMarksCardChange,
}: Props) {
  const fullName = [v.firstName.trim(), v.lastName.trim()].filter(Boolean).join(" ");
  const sslcScoreLabel = v.sslcResultType === "CGPA" ? "CGPA" : "Percentage (%)";
  const qualScoreLabel = v.qualResultType === "CGPA" ? "CGPA" : "Percentage (%)";

  return (
    <div className="space-y-6">
      <Section title="Student personal details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Student title">
            <select
              value={v.studentTitle}
              onChange={(e) => onChange("studentTitle", e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            >
              <option value="">Select</option>
              {STUDENT_TITLES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Full name">
            <input
              readOnly
              value={fullName}
              placeholder="Auto-generated from first and last name"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-[var(--foreground-muted)]"
            />
          </Field>
          <Field label="First name" required error={fieldErrors.firstName}>
            <input
              value={v.firstName}
              onChange={(e) => {
                onChange("firstName", e.target.value);
                clearError("firstName");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("firstName")}`}
            />
          </Field>
          <Field label="Last name" required error={fieldErrors.lastName}>
            <input
              value={v.lastName}
              onChange={(e) => {
                onChange("lastName", e.target.value);
                clearError("lastName");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("lastName")}`}
            />
          </Field>
          <Field label="Gender" required error={fieldErrors.gender}>
            <select
              value={v.gender}
              onChange={(e) => {
                onChange("gender", e.target.value);
                clearError("gender");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("gender")}`}
            >
              <option value="">Select gender</option>
              {STUDENT_GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date of birth" required error={fieldErrors.dateOfBirth}>
            <input
              type="date"
              value={v.dateOfBirth}
              onChange={(e) => {
                onChange("dateOfBirth", e.target.value);
                clearError("dateOfBirth");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("dateOfBirth")}`}
            />
          </Field>
          <Field label="Category">
            <select
              value={v.category}
              onChange={(e) => onChange("category", e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            >
              <option value="">Select category</option>
              {STUDENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Caste">
            <input
              value={v.caste}
              onChange={(e) => onChange("caste", e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            />
          </Field>
          <Field label="Religion">
            <input
              value={v.religion}
              onChange={(e) => onChange("religion", e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            />
          </Field>
          <Field label="Nationality" required error={fieldErrors.nationality}>
            <input
              value={v.nationality}
              onChange={(e) => {
                onChange("nationality", e.target.value);
                clearError("nationality");
              }}
              placeholder="India"
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("nationality")}`}
            />
          </Field>
          <Field label="Mobile number" required error={fieldErrors.mobile}>
            <input
              type="tel"
              value={v.mobile}
              onChange={(e) => {
                onChange("mobile", e.target.value);
                clearError("mobile");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("mobile")}`}
            />
          </Field>
          <Field label="Parent / guardian name" required error={fieldErrors.guardianName}>
            <input
              value={v.guardianName}
              onChange={(e) => {
                onChange("guardianName", e.target.value);
                clearError("guardianName");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("guardianName")}`}
            />
          </Field>
          <Field label="Parent / guardian mobile" required error={fieldErrors.guardianMobile}>
            <input
              type="tel"
              value={v.guardianMobile}
              onChange={(e) => {
                onChange("guardianMobile", e.target.value.replace(/\D/g, "").slice(0, 15));
                clearError("guardianMobile");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("guardianMobile")}`}
            />
          </Field>
          <Field label="Email address" required error={fieldErrors.email}>
            <input
              type="email"
              value={v.email}
              onChange={(e) => {
                onChange("email", e.target.value);
                clearError("email");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("email")}`}
            />
          </Field>
          <Field label="UIDAI number" error={fieldErrors.uidaiNumber}>
            <input
              value={v.uidaiNumber}
              onChange={(e) => {
                onChange("uidaiNumber", e.target.value.replace(/\D/g, "").slice(0, 12));
                clearError("uidaiNumber");
              }}
              placeholder="12-digit Aadhaar (optional)"
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("uidaiNumber")}`}
            />
          </Field>
          <Field label="ABC ID / APAAR ID">
            <input
              value={v.abcApaarId}
              onChange={(e) => onChange("abcApaarId", e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            />
          </Field>
          <Field label="State" required error={fieldErrors.admissionState}>
            <select
              value={v.admissionState}
              onChange={(e) => {
                onChange("admissionState", e.target.value);
                clearError("admissionState");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("admissionState")}`}
            >
              <option value="">Select state</option>
              {INDIAN_STATES_AND_UT.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Student photo" error={fieldErrors.photoFile}>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                Optional — JPG, JPEG, or PNG, max 2 MB
                {isEdit && existingPhotoUrl && !photoFile ? " · Upload only to replace the current photo." : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-start gap-4">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]">
                  Choose photo
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    className="sr-only"
                    onChange={(e) => {
                      onPhotoChange(e.target.files?.[0] ?? null);
                      clearError("photoFile");
                    }}
                  />
                </label>
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Preview" className="h-24 w-24 rounded-lg border object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed text-xs text-[var(--foreground-muted)]">
                    Preview
                  </div>
                )}
              </div>
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Address details">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Address line 1" required error={fieldErrors.addressLine1}>
              <input
                value={v.addressLine1}
                onChange={(e) => {
                  onChange("addressLine1", e.target.value);
                  clearError("addressLine1");
                }}
                className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("addressLine1")}`}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Address line 2">
              <input
                value={v.addressLine2}
                onChange={(e) => onChange("addressLine2", e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              />
            </Field>
          </div>
          <Field label="City" required error={fieldErrors.city}>
            <input
              value={v.city}
              onChange={(e) => {
                onChange("city", e.target.value);
                clearError("city");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("city")}`}
            />
          </Field>
          <Field label="District" required error={fieldErrors.district}>
            <input
              value={v.district}
              onChange={(e) => {
                onChange("district", e.target.value);
                clearError("district");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("district")}`}
            />
          </Field>
          <Field label="State" required error={fieldErrors.state}>
            <select
              value={v.state}
              onChange={(e) => {
                onChange("state", e.target.value);
                clearError("state");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("state")}`}
            >
              <option value="">Select state</option>
              {INDIAN_STATES_AND_UT.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Country" required error={fieldErrors.country}>
            <input
              value={v.country}
              onChange={(e) => {
                onChange("country", e.target.value);
                clearError("country");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("country")}`}
            />
          </Field>
          <Field label="PIN code" required error={fieldErrors.pincode}>
            <input
              value={v.pincode}
              onChange={(e) => {
                onChange("pincode", e.target.value.replace(/\D/g, "").slice(0, 6));
                clearError("pincode");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("pincode")}`}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Correspondence address" required error={fieldErrors.correspondenceAddress}>
              <textarea
                rows={3}
                value={v.correspondenceAddress}
                onChange={(e) => {
                  onChange("correspondenceAddress", e.target.value);
                  clearError("correspondenceAddress");
                }}
                className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("correspondenceAddress")}`}
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Academic details — 10th standard">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="School name" required error={fieldErrors.sslcSchool}>
              <input
                value={v.sslcSchool}
                onChange={(e) => {
                  onChange("sslcSchool", e.target.value);
                  clearError("sslcSchool");
                }}
                className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("sslcSchool")}`}
              />
            </Field>
          </div>
          <Field label="Board name" required error={fieldErrors.sslcBoard}>
            <select
              value={v.sslcBoard}
              onChange={(e) => {
                onChange("sslcBoard", e.target.value);
                clearError("sslcBoard");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("sslcBoard")}`}
            >
              <option value="">Select board</option>
              {SSLC_BOARDS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year of passing (YOP)" required error={fieldErrors.sslcYear}>
            <input
              value={v.sslcYear}
              onChange={(e) => {
                onChange("sslcYear", e.target.value.replace(/\D/g, "").slice(0, 4));
                clearError("sslcYear");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("sslcYear")}`}
            />
          </Field>
          <Field label="Result type" required error={fieldErrors.sslcResultType}>
            <select
              value={v.sslcResultType}
              onChange={(e) => {
                onChange("sslcResultType", e.target.value);
                clearError("sslcResultType");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("sslcResultType")}`}
            >
              <option value="">Select result type</option>
              {SSLC_RESULT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={sslcScoreLabel} required error={fieldErrors.sslcPercent}>
            <input
              value={v.sslcPercent}
              onChange={(e) => {
                onChange("sslcPercent", e.target.value);
                clearError("sslcPercent");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("sslcPercent")}`}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Marks card upload" error={fieldErrors.sslcMarksCardFile}>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                Optional — PDF, JPG, or PNG, max 5 MB
                {existingSslcMarksCardUrl && !sslcMarksCardFile ? " · A marks card is already on file." : ""}
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => {
                  onSslcMarksCardChange(e.target.files?.[0] ?? null);
                  clearError("sslcMarksCardFile");
                }}
                className="mt-2 block w-full text-sm"
              />
              {sslcMarksCardFile ? (
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">{sslcMarksCardFile.name}</p>
              ) : null}
            </Field>
          </div>
        </div>
      </Section>
      <Section title="Academic details — 12th / ITI / Diploma">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Qualification" required error={fieldErrors.qualificationType}>
              <select
                value={v.qualificationType}
                onChange={(e) => {
                  onChange("qualificationType", e.target.value);
                  clearError("qualificationType");
                }}
                className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("qualificationType")}`}
              >
                <option value="">Select qualification</option>
                {HIGHER_QUALIFICATION_TYPES.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {v.qualificationType ? (
            <>
              <div className="sm:col-span-2">
                <Field label="Institution name" required error={fieldErrors.qualInstitution}>
                  <input
                    value={v.qualInstitution}
                    onChange={(e) => {
                      onChange("qualInstitution", e.target.value);
                      clearError("qualInstitution");
                    }}
                    className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("qualInstitution")}`}
                  />
                </Field>
              </div>
              <Field label="Board / university name" required error={fieldErrors.qualBoardUniversity}>
                <input
                  value={v.qualBoardUniversity}
                  onChange={(e) => {
                    onChange("qualBoardUniversity", e.target.value);
                    clearError("qualBoardUniversity");
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("qualBoardUniversity")}`}
                />
              </Field>
              <Field label="Year of passing (YOP)" required error={fieldErrors.qualYear}>
                <input
                  value={v.qualYear}
                  onChange={(e) => {
                    onChange("qualYear", e.target.value.replace(/\D/g, "").slice(0, 4));
                    clearError("qualYear");
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("qualYear")}`}
                />
              </Field>
              <Field label="Result type" required error={fieldErrors.qualResultType}>
                <select
                  value={v.qualResultType}
                  onChange={(e) => {
                    onChange("qualResultType", e.target.value);
                    clearError("qualResultType");
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("qualResultType")}`}
                >
                  <option value="">Select result type</option>
                  {SSLC_RESULT_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={qualScoreLabel} required error={fieldErrors.qualScore}>
                <input
                  value={v.qualScore}
                  onChange={(e) => {
                    onChange("qualScore", e.target.value);
                    clearError("qualScore");
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("qualScore")}`}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Marks card upload" error={fieldErrors.qualMarksCardFile}>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                    Optional — PDF, JPG, or PNG, max 5 MB
                    {existingQualMarksCardUrl && !qualMarksCardFile ? " · A marks card is already on file." : ""}
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(e) => {
                      onQualMarksCardChange(e.target.files?.[0] ?? null);
                      clearError("qualMarksCardFile");
                    }}
                    className="mt-2 block w-full text-sm"
                  />
                  {qualMarksCardFile ? (
                    <p className="mt-1 text-xs text-[var(--foreground-muted)]">{qualMarksCardFile.name}</p>
                  ) : null}
                </Field>
              </div>
            </>
          ) : null}
        </div>
      </Section>
    </div>
  );
}

export function createEmptyStudentFormValues(): ConsultantStudentFormValues {
  return {
    studentTitle: "",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    gender: "",
    dateOfBirth: "",
    category: "",
    caste: "",
    religion: "",
    nationality: "India",
    guardianName: "",
    guardianMobile: "",
    uidaiNumber: "",
    abcApaarId: "",
    admissionState: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    state: "",
    country: "India",
    pincode: "",
    correspondenceAddress: "",
    sslcSchool: "",
    sslcBoard: "",
    sslcYear: "",
    sslcResultType: "",
    sslcPercent: "",
    qualificationType: "",
    qualInstitution: "",
    qualBoardUniversity: "",
    qualYear: "",
    qualResultType: "",
    qualScore: "",
  };
}
