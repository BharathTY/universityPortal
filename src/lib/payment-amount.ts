/** Parse a rupee amount string — mandatory, numbers only, > 0, max 2 decimal places. */
export function parseAmountRupees(input: string): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Amount is required" };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, error: "Enter a valid amount (numbers only, max 2 decimal places)" };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: "Amount must be greater than zero" };
  return { ok: true, value: n };
}
