/** Stable code stored on admission leads for attribution. */
export function consultantCodeFromUserId(userId: string): string {
  const tail = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-10).toUpperCase();
  return `CONS-${tail || "USER"}`;
}
