import type { AdmissionLeadStatus } from "@prisma/client";
import { isPaidLeadStatus, isReadyToPayStatus, isRejectedLeadStatus } from "@/lib/lead-status";

/** Tailwind classes for lead ageing pills (warmer colour as days increase). */
export function leadAgeingBadgeClass(createdAt: Date): string {
  const days = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
  if (days <= 7) return "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200";
  if (days <= 14) return "bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-200";
  return "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200";
}

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
