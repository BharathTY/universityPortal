/**
 * Whether Master "University details" has been filled in (location, priced streams, or hostel fees).
 * Stream rows with only a name (e.g. from admissions) do not count until degree type or stream fee is set.
 */
export function universityHasDetailsSaved(u: {
  location: string | null;
  streams: { degreeType: string | null; streamFee: unknown }[];
  hostelFees: { amount: unknown }[];
}): boolean {
  if ((u.location ?? "").trim().length > 0) return true;
  for (const h of u.hostelFees) {
    if (h.amount != null) return true;
  }
  for (const s of u.streams) {
    if ((s.degreeType ?? "").trim().length > 0) return true;
    if (s.streamFee != null) return true;
  }
  return false;
}
