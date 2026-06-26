export const STUDENT_FULL_NAME_AADHAAR_HINT =
  "Enter your name exactly as it appears on your Aadhaar card";

/** Display / form value from stored first + last name parts. */
export function joinStudentFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
}

/** Split Aadhaar-style full name for legacy firstName / lastName columns. */
export function splitStudentFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(" ").filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "-" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}
