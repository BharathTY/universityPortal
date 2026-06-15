import { ScholarshipType } from "@prisma/client";

export const SCHOLARSHIP_TYPE_OPTIONS: { value: ScholarshipType; label: string }[] = [
  { value: ScholarshipType.MERIT_BASED, label: "Merit based" },
  { value: ScholarshipType.MARKS_BASED, label: "Marks based" },
  { value: ScholarshipType.CASTE_BASED, label: "Caste based" },
  { value: ScholarshipType.SPORTS_QUOTA, label: "Sports quota" },
  { value: ScholarshipType.OTHER, label: "Other" },
];

export const SCHOLARSHIP_TYPE_LABELS: Record<ScholarshipType, string> = Object.fromEntries(
  SCHOLARSHIP_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ScholarshipType, string>;

export type ScholarshipEntry = {
  id: string;
  type: ScholarshipType | "";
  value: string;
};

export function createEmptyScholarshipEntry(): ScholarshipEntry {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sch-${Date.now()}-${Math.random()}`,
    type: "",
    value: "",
  };
}

function isScholarshipStarted(entry: ScholarshipEntry): boolean {
  return entry.type !== "" || entry.value.trim().length > 0;
}

export function validateScholarshipEntries(entries: ScholarshipEntry[]): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const entry of entries.filter(isScholarshipStarted)) {
    if (!entry.type) {
      errors[`scholarship-${entry.id}-type`] = "Select a scholarship type";
    }

    const val = Number(entry.value.trim());
    if (!entry.value.trim()) {
      errors[`scholarship-${entry.id}-value`] = "Scholarship value is required";
    } else if (!Number.isFinite(val) || val <= 0) {
      errors[`scholarship-${entry.id}-value`] = "Enter a valid scholarship value";
    }
  }

  return errors;
}

export function scholarshipsToPayload(entries: ScholarshipEntry[]) {
  return entries
    .filter((e) => e.type !== "" && e.value.trim().length > 0)
    .map((e, sortOrder) => ({
      type: e.type as ScholarshipType,
      value: Number(e.value.trim()),
      criteria: [] as string[],
      sortOrder,
    }));
}

export function formatScholarshipSummary(type: ScholarshipType, value: string): string {
  return `${SCHOLARSHIP_TYPE_LABELS[type]} — ${value}`;
}
