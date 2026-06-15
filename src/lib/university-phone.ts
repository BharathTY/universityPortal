export const UNIVERSITY_PHONE_MESSAGES = {
  required: "University contact number is required",
  numeric: "Only numeric values are allowed",
  length: "Contact number must be 10 digits",
} as const;

/** Returns an error message, or null when valid. */
export function validateUniversityPhone(raw: string): string | null {
  const p = raw.trim();
  if (p.length === 0) return UNIVERSITY_PHONE_MESSAGES.required;
  if (!/^\d+$/.test(p)) return UNIVERSITY_PHONE_MESSAGES.numeric;
  if (p.length !== 10) return UNIVERSITY_PHONE_MESSAGES.length;
  return null;
}

export function stripUniversityPhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}
