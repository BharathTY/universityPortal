import { stripUniversityPhoneInput, validateUniversityPhone } from "@/lib/university-phone";

export type UniversityMouSpocDraft = {
  id: string;
  name: string;
  designation: string;
  mobile: string;
  email: string;
};

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export const UNIVERSITY_MOU_SPOC_MESSAGES = {
  required: "Add at least one MOU SPOC",
  nameRequired: "Name is required",
  designationRequired: "Designation is required",
  mobileRequired: "Mobile number is required",
  mobileLength: "Mobile number must be 10 digits",
  emailRequired: "Email ID is required",
  emailInvalid: "Enter a valid email ID",
  emailDuplicate: "Each MOU SPOC must have a unique email ID",
} as const;

export function createEmptyUniversityMouSpocDraft(): UniversityMouSpocDraft {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `mou-spoc-${Date.now()}-${Math.random()}`,
    name: "",
    designation: "",
    mobile: "",
    email: "",
  };
}

export function isUniversityMouSpocRowFilled(row: UniversityMouSpocDraft): boolean {
  return Boolean(row.name.trim() || row.designation.trim() || row.mobile.trim() || row.email.trim());
}

export function isUniversityMouSpocRowComplete(row: UniversityMouSpocDraft): boolean {
  return (
    row.name.trim().length > 0 &&
    row.designation.trim().length > 0 &&
    /^\d{10}$/.test(row.mobile.trim()) &&
    looksLikeEmail(row.email)
  );
}

export function completeUniversityMouSpocRows(rows: UniversityMouSpocDraft[]): UniversityMouSpocDraft[] {
  return rows.filter(isUniversityMouSpocRowComplete);
}

export function mouSpocFieldKey(index: number, field: string, rowCount: number): string {
  if (rowCount === 1) return `mouSpoc${field.charAt(0).toUpperCase()}${field.slice(1)}`;
  return `mouSpocs.${index}${field.charAt(0).toUpperCase()}${field.slice(1)}`;
}

function spocMobileError(mobile: string): string | null {
  const err = validateUniversityPhone(mobile);
  if (!err) return null;
  if (err.includes("10 digits")) return UNIVERSITY_MOU_SPOC_MESSAGES.mobileLength;
  if (err.includes("required")) return UNIVERSITY_MOU_SPOC_MESSAGES.mobileRequired;
  return err;
}

export function validateUniversityMouSpocRows(rows: UniversityMouSpocDraft[]): Record<string, string> {
  const e: Record<string, string> = {};
  const rowsToValidate = rows.length === 1 ? rows : rows.filter(isUniversityMouSpocRowFilled);

  if (rowsToValidate.length === 0) {
    e[mouSpocFieldKey(0, "name", rows.length)] = UNIVERSITY_MOU_SPOC_MESSAGES.required;
    return e;
  }

  const seenEmails = new Set<string>();

  for (let i = 0; i < rowsToValidate.length; i++) {
    const row = rowsToValidate[i]!;
    const rowIndex = rows.indexOf(row);
    const prefix = (field: string) => mouSpocFieldKey(rowIndex, field, rows.length);

    if (row.name.trim().length === 0) e[prefix("name")] = UNIVERSITY_MOU_SPOC_MESSAGES.nameRequired;
    if (row.designation.trim().length === 0) {
      e[prefix("designation")] = UNIVERSITY_MOU_SPOC_MESSAGES.designationRequired;
    }

    const mobileError = spocMobileError(row.mobile.trim());
    if (mobileError) e[prefix("mobile")] = mobileError;

    const email = row.email.trim();
    if (email.length === 0) e[prefix("email")] = UNIVERSITY_MOU_SPOC_MESSAGES.emailRequired;
    else if (!looksLikeEmail(email)) e[prefix("email")] = UNIVERSITY_MOU_SPOC_MESSAGES.emailInvalid;
    else if (seenEmails.has(email.toLowerCase())) {
      e[prefix("email")] = UNIVERSITY_MOU_SPOC_MESSAGES.emailDuplicate;
    } else {
      seenEmails.add(email.toLowerCase());
    }
  }

  return e;
}

export { stripUniversityPhoneInput };
