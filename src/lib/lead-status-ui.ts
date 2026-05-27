import type { AdmissionLeadStatus } from "@prisma/client";
import { isPaidLeadStatus, isReadyToPayStatus, isRejectedLeadStatus } from "@/lib/lead-status";

/** Tailwind classes for lead status pills in tables and cards. */
export function leadStatusBadgeClass(status: AdmissionLeadStatus): string {
  if (isPaidLeadStatus(status)) {
    return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
  }
  if (isReadyToPayStatus(status)) {
    return "bg-[var(--accent)]/20 text-[var(--accent-foreground)] dark:text-[var(--accent)]";
  }
  if (isRejectedLeadStatus(status)) {
    return "bg-red-500/10 text-red-800 dark:text-red-200";
  }
  if (status === "NEW_LEAD") {
    return "bg-[var(--primary)]/12 text-[var(--primary)]";
  }
  return "bg-[var(--muted)] text-[var(--foreground-muted)]";
}
