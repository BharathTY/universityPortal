export const PERCENTAGE_SCORE_MIN = 35;
export const PERCENTAGE_SCORE_MAX = 100;
export const CGPA_SCORE_MIN = 0;
export const CGPA_SCORE_MAX = 10;

export function validateEducationScore(
  scoreRaw: string | number | null | undefined,
  resultType: string,
): string | null {
  if (scoreRaw == null || String(scoreRaw).trim() === "" || !resultType) return null;
  const n = Number(String(scoreRaw).replace(/,/g, ""));
  if (!Number.isFinite(n)) return "Enter a valid number";
  if (resultType === "PERCENTAGE") {
    if (n < PERCENTAGE_SCORE_MIN || n > PERCENTAGE_SCORE_MAX) {
      return `Percentage must be between ${PERCENTAGE_SCORE_MIN}% and ${PERCENTAGE_SCORE_MAX}%`;
    }
  } else if (resultType === "CGPA") {
    if (n < CGPA_SCORE_MIN || n > CGPA_SCORE_MAX) {
      return `CGPA must be between ${CGPA_SCORE_MIN} and ${CGPA_SCORE_MAX}`;
    }
  }
  return null;
}
