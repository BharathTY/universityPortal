"use client";

import * as React from "react";
import { StudentPhotoUploadField, type StudentPhotoUploadRef } from "@/components/student-photo-upload-field";
import { INDIAN_STATES_AND_UT } from "@/lib/indian-states";
import {
  digitsOnlyMobileInput,
  INDIAN_MOBILE_DIGIT_LENGTH,
} from "@/lib/consultant-lead-form-validation";
import {
  HIGHER_QUALIFICATION_TYPES,
  higherQualificationShowsBoardField,
  SSLC_BOARDS,
  SSLC_RESULT_TYPES,
  STUDENT_CATEGORIES,
  STUDENT_GENDERS,
} from "@/lib/student-form-options";
import { STUDENT_FULL_NAME_AADHAAR_HINT } from "@/lib/student-full-name";
import { permanentAddressFromForm, structuredAddressesEqual, type StructuredAddress } from "@/lib/student-address";

export type ConsultantStudentFormValues = {
  studentTitle: string;
  fullName: string;
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
  currentSameAsPermanent: boolean;
  currentAddressLine1: string;
  currentAddressLine2: string;
  currentCity: string;
  currentDistrict: string;
  currentState: string;
  currentCountry: string;
  currentPincode: string;
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
  onPatch?: (patch: Partial<ConsultantStudentFormValues>) => void;
  fieldErrors: Record<string, string>;
  borderFor: (key: string) => string;
  clearError: (key: string) => void;
  isEdit: boolean;
  photoUploadRef: React.RefObject<StudentPhotoUploadRef | null>;
  existingPhotoUrl: string | null;
  sslcMarksCardFile: File | null;
  existingSslcMarksCardUrl: string | null;
  onSslcMarksCardChange: (file: File | null) => void;
  qualMarksCardFile: File | null;
  existingQualMarksCardUrl: string | null;
  onQualMarksCardChange: (file: File | null) => void;
  /** When true, 10th / 12th education fields are optional (consultant add/edit). */
  educationOptional?: boolean;
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
  photoUploadRef,
  existingPhotoUrl,
  sslcMarksCardFile,
  existingSslcMarksCardUrl,
  onSslcMarksCardChange,
  qualMarksCardFile,
  existingQualMarksCardUrl,
  onQualMarksCardChange,
  educationOptional = true,
  onPatch,
}: Props) {
  const sslcScoreLabel = v.sslcResultType === "CGPA" ? "CGPA" : "Percentage (%)";
  const qualScoreLabel = v.qualResultType === "CGPA" ? "CGPA" : "Percentage (%)";
  const eduRequired = !educationOptional;
  const sslcSectionTitle = educationOptional
    ? "Academic details — 10th standard (optional)"
    : "Academic details — 10th standard";
  const qualSectionTitle = educationOptional
    ? "Academic details — 12th / ITI / Diploma (optional)"
    : "Academic details — 12th / ITI / Diploma";
  const showQualBoardField = higherQualificationShowsBoardField(v.qualificationType);

  const permanentAddress = React.useMemo(
    () => permanentAddressFromForm(v),
    [v.addressLine1, v.addressLine2, v.city, v.district, v.state, v.country, v.pincode],
  );

  function copyPermanentToCurrent() {
    const patch: Partial<ConsultantStudentFormValues> = {
      currentAddressLine1: v.addressLine1,
      currentAddressLine2: v.addressLine2,
      currentCity: v.city,
      currentDistrict: v.district,
      currentState: v.state,
      currentCountry: v.country,
      currentPincode: v.pincode,
    };
    if (onPatch) {
      onPatch(patch);
      return;
    }
    for (const [key, value] of Object.entries(patch) as [keyof ConsultantStudentFormValues, string][]) {
      onChange(key, value);
    }
  }

  React.useEffect(() => {
    if (!v.currentSameAsPermanent) return;
    const nextCurrent: StructuredAddress = {
      addressLine1: v.currentAddressLine1,
      addressLine2: v.currentAddressLine2,
      city: v.currentCity,
      district: v.currentDistrict,
      state: v.currentState,
      country: v.currentCountry,
      pincode: v.currentPincode,
    };
    if (!structuredAddressesEqual(permanentAddress, nextCurrent)) {
      copyPermanentToCurrent();
    }
  }, [v.currentSameAsPermanent, permanentAddress, v.currentAddressLine1, v.currentAddressLine2, v.currentCity, v.currentDistrict, v.currentState, v.currentCountry, v.currentPincode]);

  function renderAddressFields(
    prefix: "permanent" | "current",
    disabled = false,
  ) {
    const isCurrent = prefix === "current";
    const line1 = isCurrent ? v.currentAddressLine1 : v.addressLine1;
    const line2 = isCurrent ? v.currentAddressLine2 : v.addressLine2;
    const city = isCurrent ? v.currentCity : v.city;
    const district = isCurrent ? v.currentDistrict : v.district;
    const state = isCurrent ? v.currentState : v.state;
    const country = isCurrent ? v.currentCountry : v.country;
    const pincode = isCurrent ? v.currentPincode : v.pincode;
    const key = (name: string) => (isCurrent ? `current${name.charAt(0).toUpperCase()}${name.slice(1)}` : name) as keyof ConsultantStudentFormValues;

    return (
      <>
        <div className="sm:col-span-2">
          <Field label="Address line 1" required={!isCurrent} error={isCurrent ? undefined : fieldErrors.addressLine1}>
            <input
              value={line1}
              disabled={disabled}
              onChange={(e) => {
                const value = e.target.value;
                onChange(key("addressLine1"), value);
                if (!isCurrent) clearError("addressLine1");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${!isCurrent ? borderFor("addressLine1") : "border-[var(--border)]"} ${disabled ? "opacity-70" : ""}`}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Address line 2">
            <input
              value={line2}
              disabled={disabled}
              onChange={(e) => onChange(key("addressLine2"), e.target.value)}
              className={`mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 ${disabled ? "opacity-70" : ""}`}
            />
          </Field>
        </div>
        <Field label="City" required={!isCurrent} error={isCurrent ? undefined : fieldErrors.city}>
          <input
            value={city}
            disabled={disabled}
            onChange={(e) => {
              onChange(key("city"), e.target.value);
              if (!isCurrent) clearError("city");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${!isCurrent ? borderFor("city") : "border-[var(--border)]"} ${disabled ? "opacity-70" : ""}`}
          />
        </Field>
        <Field label="District" required={!isCurrent} error={isCurrent ? undefined : fieldErrors.district}>
          <input
            value={district}
            disabled={disabled}
            onChange={(e) => {
              onChange(key("district"), e.target.value);
              if (!isCurrent) clearError("district");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${!isCurrent ? borderFor("district") : "border-[var(--border)]"} ${disabled ? "opacity-70" : ""}`}
          />
        </Field>
        <Field label="State" required={!isCurrent} error={isCurrent ? undefined : fieldErrors.state}>
          <select
            value={state}
            disabled={disabled}
            onChange={(e) => {
              onChange(key("state"), e.target.value);
              if (!isCurrent) clearError("state");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${!isCurrent ? borderFor("state") : "border-[var(--border)]"} ${disabled ? "opacity-70" : ""}`}
          >
            <option value="">Select state</option>
            {INDIAN_STATES_AND_UT.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Country" required={!isCurrent} error={isCurrent ? undefined : fieldErrors.country}>
          <input
            value={country}
            disabled={disabled}
            onChange={(e) => {
              onChange(key("country"), e.target.value);
              if (!isCurrent) clearError("country");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${!isCurrent ? borderFor("country") : "border-[var(--border)]"} ${disabled ? "opacity-70" : ""}`}
          />
        </Field>
        <Field label="PIN code" required={!isCurrent} error={isCurrent ? undefined : fieldErrors.pincode}>
          <input
            value={pincode}
            disabled={disabled}
            onChange={(e) => {
              onChange(key("pincode"), e.target.value.replace(/\D/g, "").slice(0, 6));
              if (!isCurrent) clearError("pincode");
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${!isCurrent ? borderFor("pincode") : "border-[var(--border)]"} ${disabled ? "opacity-70" : ""}`}
          />
        </Field>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Student personal details">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Full name" required error={fieldErrors.fullName}>
              <input
                value={v.fullName}
                onChange={(e) => {
                  onChange("fullName", e.target.value);
                  clearError("fullName");
                }}
                className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("fullName")}`}
              />
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">{STUDENT_FULL_NAME_AADHAAR_HINT}</p>
            </Field>
          </div>
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
          <Field label="Student phone number" required error={fieldErrors.mobile}>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={INDIAN_MOBILE_DIGIT_LENGTH}
              value={v.mobile}
              onChange={(e) => {
                onChange("mobile", digitsOnlyMobileInput(e.target.value));
                clearError("mobile");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("mobile")}`}
            />
          </Field>
          <Field label="Parent/guardian name" required error={fieldErrors.guardianName}>
            <input
              value={v.guardianName}
              onChange={(e) => {
                onChange("guardianName", e.target.value);
                clearError("guardianName");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("guardianName")}`}
            />
          </Field>
          <Field label="Parent/guardian phone number" required error={fieldErrors.guardianMobile}>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={INDIAN_MOBILE_DIGIT_LENGTH}
              value={v.guardianMobile}
              onChange={(e) => {
                onChange("guardianMobile", digitsOnlyMobileInput(e.target.value));
                clearError("guardianMobile");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("guardianMobile")}`}
            />
          </Field>
          <Field label="Student email" required error={fieldErrors.email}>
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
            <StudentPhotoUploadField
              ref={photoUploadRef}
              existingPhotoUrl={existingPhotoUrl}
              apiError={fieldErrors.photoFile}
              isEdit={isEdit}
            />
          </div>
        </div>
      </Section>

      <Section title="Permanent address">
        <div className="grid gap-4 sm:grid-cols-2">{renderAddressFields("permanent")}</div>
      </Section>

      <Section title="Current address">
        <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={v.currentSameAsPermanent}
            onChange={(e) => {
              const checked = e.target.checked;
              if (onPatch) {
                onPatch({ currentSameAsPermanent: checked });
                if (checked) copyPermanentToCurrent();
              } else {
                onChange("currentSameAsPermanent", checked);
                if (checked) copyPermanentToCurrent();
              }
            }}
            className="rounded border-[var(--border)]"
          />
          Current Address is the same as Permanent Address.
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {renderAddressFields("current", v.currentSameAsPermanent)}
        </div>
      </Section>

      <Section title={sslcSectionTitle}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="School name" required={eduRequired} error={fieldErrors.sslcSchool}>
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
          <Field label="Board name" required={eduRequired} error={fieldErrors.sslcBoard}>
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
          <Field label="Year of passing (YOP)" required={eduRequired} error={fieldErrors.sslcYear}>
            <input
              value={v.sslcYear}
              onChange={(e) => {
                onChange("sslcYear", e.target.value.replace(/\D/g, "").slice(0, 4));
                clearError("sslcYear");
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("sslcYear")}`}
            />
          </Field>
          <Field label="Result type" required={eduRequired} error={fieldErrors.sslcResultType}>
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
          <Field label={sslcScoreLabel} required={eduRequired} error={fieldErrors.sslcPercent}>
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
      <Section title={qualSectionTitle}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Qualification" required={eduRequired} error={fieldErrors.qualificationType}>
              <select
                value={v.qualificationType}
                onChange={(e) => {
                  const next = e.target.value;
                  onChange("qualificationType", next);
                  clearError("qualificationType");
                  if (!higherQualificationShowsBoardField(next)) {
                    onChange("qualBoardUniversity", "");
                    clearError("qualBoardUniversity");
                  }
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
                <Field label="Institution name" required={eduRequired} error={fieldErrors.qualInstitution}>
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
              {showQualBoardField ? (
                <Field label="Board / university name" required={eduRequired} error={fieldErrors.qualBoardUniversity}>
                  <input
                    value={v.qualBoardUniversity}
                    onChange={(e) => {
                      onChange("qualBoardUniversity", e.target.value);
                      clearError("qualBoardUniversity");
                    }}
                    className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("qualBoardUniversity")}`}
                  />
                </Field>
              ) : null}
              <Field label="Year of passing (YOP)" required={eduRequired} error={fieldErrors.qualYear}>
                <input
                  value={v.qualYear}
                  onChange={(e) => {
                    onChange("qualYear", e.target.value.replace(/\D/g, "").slice(0, 4));
                    clearError("qualYear");
                  }}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("qualYear")}`}
                />
              </Field>
              <Field label="Result type" required={eduRequired} error={fieldErrors.qualResultType}>
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
              <Field label={qualScoreLabel} required={eduRequired} error={fieldErrors.qualScore}>
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
    fullName: "",
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
    currentSameAsPermanent: false,
    currentAddressLine1: "",
    currentAddressLine2: "",
    currentCity: "",
    currentDistrict: "",
    currentState: "",
    currentCountry: "India",
    currentPincode: "",
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
