/** Stable-enough client-side row id; works on HTTP where crypto.randomUUID is unavailable. */
export function newClientId(prefix = "row"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
