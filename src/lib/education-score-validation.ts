export const PERCENTAGE_SCORE_MIN = 35;
export const PERCENTAGE_SCORE_MAX = 100;
export const CGPA_SCORE_MIN = 0;
export const CGPA_SCORE_MAX = 10;

export type EducationResultType = "PERCENTAGE" | "CGPA" | string;

/**
 * Keep only a safe decimal score typing shape: digits with at most one decimal point.
 * Empty string is allowed (optional fields).
 */
export function sanitizeEducationScoreInput(raw: string): string {
  let cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }
  // Cap length so users cannot paste absurd values; validation still enforces ranges.
  if (cleaned.length > 6) cleaned = cleaned.slice(0, 6);
  return cleaned;
}

export function parseEducationScoreNumber(
  scoreRaw: string | number | null | undefined,
): number | null {
  if (scoreRaw == null) return null;
  const t = String(scoreRaw).trim().replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function validateEducationScore(
  scoreRaw: string | number | null | undefined,
  resultType: EducationResultType,
): string | null {
  const t = scoreRaw == null ? "" : String(scoreRaw).trim();
  if (t === "") return null;
  if (!resultType) {
    return "Select a result type for the score";
  }

  const n = parseEducationScoreNumber(t);
  if (n == null) return "Enter a valid number";

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

export function educationScoreInputAttrs(resultType: EducationResultType): {
  min?: number;
  max?: number;
  step: string;
  inputMode: "decimal";
} {
  if (resultType === "PERCENTAGE") {
    return {
      min: PERCENTAGE_SCORE_MIN,
      max: PERCENTAGE_SCORE_MAX,
      step: "0.01",
      inputMode: "decimal",
    };
  }
  if (resultType === "CGPA") {
    return {
      min: CGPA_SCORE_MIN,
      max: CGPA_SCORE_MAX,
      step: "0.01",
      inputMode: "decimal",
    };
  }
  return { step: "0.01", inputMode: "decimal" };
}
