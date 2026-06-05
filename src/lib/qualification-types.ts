export const QUALIFICATION_TYPES = [
  { value: "PUC", label: "PUC / 12th" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "ITI", label: "ITI" },
] as const;

export type QualificationType = (typeof QUALIFICATION_TYPES)[number]["value"];

export function qualificationLabel(value: string | null | undefined): string {
  const found = QUALIFICATION_TYPES.find((q) => q.value === value);
  return found?.label ?? value ?? "";
}
