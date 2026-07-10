import type { AdmissionLeadStatus } from "@prisma/client";

export const LEAD_STATUS_WORKFLOW_MESSAGE =
  "Please follow the defined lead status workflow. You cannot skip intermediate statuses.";

export const READY_TO_PAY_LOCKED_MESSAGE =
  "Ready to Pay is no longer available after Payment Done.";

const STRICT_SEQUENCE: AdmissionLeadStatus[] = [
  "READY_TO_PAY",
  "PAYMENT_DONE",
  "ENROLLED",
  "CAMPUS_VISIT_DONE",
];

const STRICT_INDEX = new Map(STRICT_SEQUENCE.map((s, i) => [s, i]));

function strictIndex(status: AdmissionLeadStatus): number | null {
  return STRICT_INDEX.get(status) ?? null;
}

/** Lead has reached Payment Done or a later workflow stage — Ready to Pay must not be re-selected. */
export function hasAdvancedPastReadyToPay(status: AdmissionLeadStatus): boolean {
  const idx = strictIndex(status);
  const readyIdx = strictIndex("READY_TO_PAY");
  return idx !== null && readyIdx !== null && idx > readyIdx;
}

/**
 * Ready to Pay is locked once payment is done (current status, prior Payment Done
 * history, or a successful payment record).
 */
export function isReadyToPayLocked(
  current: AdmissionLeadStatus,
  options?: { paymentCompleted?: boolean },
): boolean {
  if (options?.paymentCompleted) return true;
  return hasAdvancedPastReadyToPay(current);
}

/** Whether a lead may move from `current` to `next` without skipping mandatory stages. */
export function canTransitionLeadStatus(
  current: AdmissionLeadStatus,
  next: AdmissionLeadStatus,
  options?: { paymentCompleted?: boolean },
): boolean {
  if (current === next) return true;

  if (next === "READY_TO_PAY" && isReadyToPayLocked(current, options)) {
    return false;
  }

  const currentStrict = strictIndex(current);
  const nextStrict = strictIndex(next);

  if (nextStrict === null) return true;

  if (currentStrict === null) {
    return nextStrict === 0;
  }

  if (nextStrict < currentStrict) return false;

  return nextStrict <= currentStrict + 1;
}

export function isLeadStatusOptionEnabled(
  current: AdmissionLeadStatus,
  option: AdmissionLeadStatus,
  options?: { paymentCompleted?: boolean },
): boolean {
  if (option === "READY_TO_PAY" && isReadyToPayLocked(current, options)) {
    return false;
  }
  return canTransitionLeadStatus(current, option, options);
}
