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
