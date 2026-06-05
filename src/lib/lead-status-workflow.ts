import type { AdmissionLeadStatus } from "@prisma/client";

export const LEAD_STATUS_WORKFLOW_MESSAGE =
  "Please follow the defined lead status workflow. You cannot skip intermediate statuses.";

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

/** Whether a lead may move from `current` to `next` without skipping mandatory stages. */
export function canTransitionLeadStatus(
  current: AdmissionLeadStatus,
  next: AdmissionLeadStatus,
): boolean {
  if (current === next) return true;

  const currentStrict = strictIndex(current);
  const nextStrict = strictIndex(next);

  if (nextStrict === null) return true;

  if (currentStrict === null) {
    return nextStrict === 0;
  }

  return nextStrict <= currentStrict + 1;
}

export function isLeadStatusOptionEnabled(
  current: AdmissionLeadStatus,
  option: AdmissionLeadStatus,
): boolean {
  return canTransitionLeadStatus(current, option);
}
