/** Paise — Razorpay orders and verification must use the same amounts. */
export const LEGACY_REGISTRATION_PAISE = 2500 * 100;
export const PROGRAM_PAISE = 50_000 * 100;

export type StudentAdmissionPath = "NATIONAL_EXAM" | "DIRECT_ADMISSION";

export function registrationPaiseForPath(path: StudentAdmissionPath | null | undefined): number {
  if (path === "NATIONAL_EXAM") return 999 * 100;
  if (path === "DIRECT_ADMISSION") return 10_000 * 100;
  return LEGACY_REGISTRATION_PAISE;
}

export function registrationRupeesForPath(path: StudentAdmissionPath | null | undefined): number {
  return registrationPaiseForPath(path) / 100;
}

/** Parse DD/MM/YYYY + AM|PM into a local DateTime (09:00 / 14:00). */
export function parseAdmissionVisitAtFromStructured(
  dateText: string,
  slot: "AM" | "PM",
): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateText.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour = slot === "PM" ? 14 : 9;
  const d = new Date(year, month - 1, day, hour, 0, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}
