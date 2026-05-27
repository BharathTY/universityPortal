/** How many future years to offer when adding YOP / academic intake years. */
export const YOP_YEARS_AHEAD = 15;

/** Earliest selectable YOP is the current calendar year (past years excluded). */
export function minSelectableYopYear(now = new Date()): number {
  return now.getFullYear();
}

export function maxSelectableYopYear(now = new Date()): number {
  return minSelectableYopYear(now) + YOP_YEARS_AHEAD;
}

export function buildSelectableYopYears(now = new Date()): number[] {
  const min = minSelectableYopYear(now);
  const max = maxSelectableYopYear(now);
  const years: number[] = [];
  for (let y = min; y <= max; y++) years.push(y);
  return years;
}

export function isSelectableYopYear(year: number, now = new Date()): boolean {
  return year >= minSelectableYopYear(now) && year <= maxSelectableYopYear(now);
}

/** e.g. 2026 → "2026/27" */
export function formatAcademicYearLabel(startYear: number): string {
  const endShort = String(startYear + 1).slice(-2);
  return `${startYear}/${endShort}`;
}

/** Parse start year from "2026/27" or legacy "2026". */
export function parseAcademicYearStartYear(label: string): number | null {
  const t = label.trim();
  const range = /^(\d{4})\/(\d{2})$/.exec(t);
  if (range) {
    const start = Number(range[1]);
    const endShort = range[2]!;
    if (!Number.isFinite(start)) return null;
    if (endShort !== String(start + 1).slice(-2)) return null;
    return start;
  }
  const plain = /^(\d{4})$/.exec(t);
  if (plain) return Number(plain[1]);
  return null;
}

/** Canonical label for storage/display, or null if invalid. */
export function normalizeAcademicYearLabel(label: string, now = new Date()): string | null {
  const start = parseAcademicYearStartYear(label);
  if (start === null || !isSelectableYopYear(start, now)) return null;
  return formatAcademicYearLabel(start);
}

export function buildSelectableYopYearLabels(now = new Date()): string[] {
  return buildSelectableYopYears(now).map(formatAcademicYearLabel);
}

export function isSelectableYopYearLabel(label: string, now = new Date()): boolean {
  return normalizeAcademicYearLabel(label, now) !== null;
}

/** Display helper — upgrades legacy "2026" labels to "2026/27". */
export function displayAcademicYearLabel(label: string): string {
  const start = parseAcademicYearStartYear(label);
  if (start === null) return label;
  return formatAcademicYearLabel(start);
}

export function minSelectableYopYearLabel(now = new Date()): string {
  return formatAcademicYearLabel(minSelectableYopYear(now));
}

export function maxSelectableYopYearLabel(now = new Date()): string {
  return formatAcademicYearLabel(maxSelectableYopYear(now));
}
