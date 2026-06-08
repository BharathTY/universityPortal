/** Default UPI from env when a university has no paymentUpiId in the database. */
export function defaultCollectPaymentUpiIdFromEnv(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_COLLECT_UPI_ID?.trim() ||
    process.env.COLLECT_UPI_ID?.trim() ||
    "";
  const cleaned = raw.replace(/^"|"$/g, "").trim();
  return cleaned || null;
}

/** Per-university UPI on the record, else NEXT_PUBLIC_COLLECT_UPI_ID / COLLECT_UPI_ID from .env. */
export function resolveUniversityPaymentUpiId(fromDb: string | null | undefined): string | null {
  const db = fromDb?.trim();
  if (db) return db;
  return defaultCollectPaymentUpiIdFromEnv();
}
