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

export function universitySpocFieldKey(index: number, field: string, rowCount: number): string {
  if (rowCount === 1) return `spoc${field.charAt(0).toUpperCase()}${field.slice(1)}`;
  return `spocs.${index}${field.charAt(0).toUpperCase()}${field.slice(1)}`;
}

export function validateUniversitySpocRows(rows: UniversitySpocDraft[]): Record<string, string> {
  const e: Record<string, string> = {};
  const rowsToValidate =
    rows.length === 1 ? rows : rows.filter(isUniversitySpocRowFilled);

  if (rowsToValidate.length === 0) {
    e[universitySpocFieldKey(0, "name", rows.length)] = "Add at least one SPOC";
    return e;
  }

  const seenEmails = new Set<string>();

  for (let i = 0; i < rowsToValidate.length; i++) {
    const row = rowsToValidate[i]!;
    const rowIndex = rows.indexOf(row);
    const prefix = (field: string) => universitySpocFieldKey(rowIndex, field, rows.length);

    const name = row.name.trim();
    if (name.length === 0) e[prefix("name")] = "SPOC name is required";

    const designation = row.designation.trim();
    if (designation.length === 0) e[prefix("designation")] = "Designation is required";

    const mobile = row.mobile.trim();
    if (mobile.length === 0) e[prefix("mobile")] = "Mobile number is required";
    else if (!/^\d+$/.test(mobile)) e[prefix("mobile")] = "Only numeric values are allowed";
    else if (mobile.length !== 10) e[prefix("mobile")] = "Phone number must be 10 digits";

    const email = row.email.trim();
    if (email.length === 0) e[prefix("email")] = "Email address is required";
    else if (!looksLikeEmail(email)) e[prefix("email")] = "Enter a valid email address";
    else if (seenEmails.has(email.toLowerCase())) {
      e[prefix("email")] = "Each SPOC must have a unique email";
    } else {
      seenEmails.add(email.toLowerCase());
    }
  }

  return e;
}
