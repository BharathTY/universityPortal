export const STUDENT_TITLES = [
  { value: "Mr", label: "Mr." },
  { value: "Ms", label: "Ms." },
  { value: "Mrs", label: "Mrs." },
] as const;

export const STUDENT_GENDERS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
] as const;

export const STUDENT_CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "OBC", label: "OBC" },
  { value: "SC", label: "SC" },
  { value: "ST", label: "ST" },
  { value: "EWS", label: "EWS" },
  { value: "OTHERS", label: "Others" },
] as const;

export const SSLC_BOARDS = [
  { value: "STATE_BOARD_SSLC", label: "State Board (SSLC)" },
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE" },
  { value: "NIOS", label: "NIOS" },
] as const;

export const SSLC_RESULT_TYPES = [
  { value: "PERCENTAGE", label: "Percentage (%)" },
  { value: "CGPA", label: "CGPA" },
] as const;

export function sslcBoardLabel(value: string | null | undefined): string {
  if (!value) return "";
  return SSLC_BOARDS.find((b) => b.value === value)?.label ?? value;
}

export const HIGHER_QUALIFICATION_TYPES = [
  { value: "PUC", label: "12th Standard" },
  { value: "ITI", label: "ITI" },
  { value: "DIPLOMA", label: "Diploma" },
] as const;

export const PROGRAM_TYPES = [
  { value: "UG", label: "Undergraduate (UG)" },
  { value: "PG", label: "Postgraduate (PG)" },
] as const;
