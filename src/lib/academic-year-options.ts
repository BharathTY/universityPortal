/** PRD §11.7: current year −1 through +3. */
export function buildAcademicYearOptions(now = new Date()): string[] {
  const y = now.getFullYear();
  return [y - 1, y, y + 1, y + 2, y + 3].map(String);
}
