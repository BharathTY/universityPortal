const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function normalizeGstNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizePanNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function validateGstNumber(raw: string): string | null {
  const value = normalizeGstNumber(raw);
  if (value.length === 0) return null;
  if (value.length !== 15) return "GST Number must be 15 characters long";
  if (!GSTIN_REGEX.test(value)) return "Please enter a valid GST Number";
  return null;
}

export function validatePanNumber(raw: string): string | null {
  const value = normalizePanNumber(raw);
  if (value.length === 0) return null;
  if (value.length !== 10) return "PAN Number must be 10 characters long";
  if (!PAN_REGEX.test(value)) return "Please enter a valid PAN Number";
  return null;
}
