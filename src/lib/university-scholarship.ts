import { ScholarshipType } from "@prisma/client";

export type ScholarshipEntry = {
  id: string;
  type: ScholarshipType;
  value: string;
  criteria: string[];
};

export function createEmptyScholarshipEntry(): ScholarshipEntry {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sch-${Date.now()}-${Math.random()}`,
    type: ScholarshipType.PERCENTAGE,
    value: "",
    criteria: [""],
  };
}

export function validateScholarshipEntries(entries: ScholarshipEntry[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const filled = entries.filter(
    (e) => e.value.trim().length > 0 || e.criteria.some((c) => c.trim().length > 0),
  );

  for (const entry of filled) {
    const val = Number(entry.value.trim());
    if (!Number.isFinite(val) || val <= 0) {
      errors[`scholarship-${entry.id}-value`] = "Enter a valid scholarship value";
      continue;
    }
    if (entry.type === ScholarshipType.PERCENTAGE && val > 100) {
      errors[`scholarship-${entry.id}-value`] = "Percentage cannot exceed 100";
    }
    const criteria = entry.criteria.map((c) => c.trim()).filter(Boolean);
    if (criteria.length === 0) {
      errors[`scholarship-${entry.id}-criteria`] = "Add at least one eligibility criterion";
    }
  }
  return errors;
}

export function scholarshipsToPayload(entries: ScholarshipEntry[]) {
  return entries
    .filter((e) => e.value.trim().length > 0)
    .map((e, sortOrder) => ({
      type: e.type,
      value: Number(e.value.trim()),
      criteria: e.criteria.map((c) => c.trim()).filter(Boolean),
      sortOrder,
    }));
}
