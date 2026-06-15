import { stripUniversityPhoneInput, validateUniversityPhone } from "@/lib/university-phone";

export type UniversitySpocDraft = {
  id: string;
  name: string;
  designation: string;
  mobile: string;
  email: string;
};

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export const UNIVERSITY_SPOC_MESSAGES = {
  required: "Add at least one SPOC",
  nameRequired: "SPOC name is required",
  designationRequired: "Designation is required",
  mobileRequired: "Mobile number is required",
  mobileLength: "Mobile number must be 10 digits",
  emailRequired: "Email ID is required",
  emailInvalid: "Enter a valid email ID",
  emailDuplicate: "Each SPOC must have a unique email ID",
} as const;

export function createEmptyUniversitySpocDraft(): UniversitySpocDraft {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `uni-spoc-${Date.now()}-${Math.random()}`,
    name: "",
    designation: "",
    mobile: "",
    email: "",
  };
}

export function isUniversitySpocRowFilled(row: UniversitySpocDraft): boolean {
  return Boolean(row.name.trim() || row.designation.trim() || row.mobile.trim() || row.email.trim());
}

export function isUniversitySpocRowComplete(row: UniversitySpocDraft): boolean {
  return (
    row.name.trim().length > 0 &&
    row.designation.trim().length > 0 &&
    /^\d{10}$/.test(row.mobile.trim()) &&
    looksLikeEmail(row.email)
  );
}

export function filledUniversitySpocRows(rows: UniversitySpocDraft[]): UniversitySpocDraft[] {
  return rows.filter(isUniversitySpocRowFilled);
}

export function completeUniversitySpocRows(rows: UniversitySpocDraft[]): UniversitySpocDraft[] {
  return rows.filter(isUniversitySpocRowComplete);
}

export function universitySpocFieldKey(index: number, field: string, rowCount: number): string {
  if (rowCount === 1) return `spoc${field.charAt(0).toUpperCase()}${field.slice(1)}`;
  return `spocs.${index}${field.charAt(0).toUpperCase()}${field.slice(1)}`;
}

function spocMobileError(mobile: string): string | null {
  const err = validateUniversityPhone(mobile);
  if (!err) return null;
  if (err.includes("10 digits")) return UNIVERSITY_SPOC_MESSAGES.mobileLength;
  if (err.includes("required")) return UNIVERSITY_SPOC_MESSAGES.mobileRequired;
  return err;
}

export function validateUniversitySpocRows(rows: UniversitySpocDraft[]): Record<string, string> {
  const e: Record<string, string> = {};
  const rowsToValidate = rows.length === 1 ? rows : rows.filter(isUniversitySpocRowFilled);

  if (rowsToValidate.length === 0) {
    e[universitySpocFieldKey(0, "name", rows.length)] = UNIVERSITY_SPOC_MESSAGES.required;
    return e;
  }

  const seenEmails = new Set<string>();

  for (let i = 0; i < rowsToValidate.length; i++) {
    const row = rowsToValidate[i]!;
    const rowIndex = rows.indexOf(row);
    const prefix = (field: string) => universitySpocFieldKey(rowIndex, field, rows.length);

    if (row.name.trim().length === 0) e[prefix("name")] = UNIVERSITY_SPOC_MESSAGES.nameRequired;
    if (row.designation.trim().length === 0) {
      e[prefix("designation")] = UNIVERSITY_SPOC_MESSAGES.designationRequired;
    }

    const mobileError = spocMobileError(row.mobile.trim());
    if (mobileError) e[prefix("mobile")] = mobileError;

    const email = row.email.trim();
    if (email.length === 0) e[prefix("email")] = UNIVERSITY_SPOC_MESSAGES.emailRequired;
    else if (!looksLikeEmail(email)) e[prefix("email")] = UNIVERSITY_SPOC_MESSAGES.emailInvalid;
    else if (seenEmails.has(email.toLowerCase())) {
      e[prefix("email")] = UNIVERSITY_SPOC_MESSAGES.emailDuplicate;
    } else {
      seenEmails.add(email.toLowerCase());
    }
  }

  return e;
}

export { stripUniversityPhoneInput };
