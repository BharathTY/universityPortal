export const UNIVERSITY_PINCODE_MESSAGES = {
  required: "Pincode is required",
  numeric: "Pincode must contain digits only",
  length: "Pincode must be 6 digits",
} as const;

/** Returns an error message, or null when valid. */
export function validateUniversityPincode(raw: string): string | null {
  const p = raw.trim();
  if (p.length === 0) return UNIVERSITY_PINCODE_MESSAGES.required;
  if (!/^\d+$/.test(p)) return UNIVERSITY_PINCODE_MESSAGES.numeric;
  if (p.length !== 6) return UNIVERSITY_PINCODE_MESSAGES.length;
  return null;
}
