import type { AdmissionLeadStatus } from "@prisma/client";

/** PRD §4.4 / §9 lead status labels for UI. */
export const LEAD_STATUS_OPTIONS: { value: AdmissionLeadStatus; label: string }[] = [
  { value: "NEW_LEAD", label: "New Lead" },
  { value: "INTERESTED", label: "Interested" },
  { value: "NOT_INTERESTED", label: "Not Interested" },
  { value: "CALL_BACK", label: "Call Back" },
  { value: "READY_TO_PAY", label: "Ready to Pay" },
  { value: "PAYMENT_DONE", label: "Payment Done" },
  { value: "IN_FUTURE", label: "In Future" },
  { value: "RNR", label: "RNR" },
  { value: "SWITCH_OFF", label: "Switch Off" },
  { value: "WRONG_NUMBER", label: "Wrong Number / Invalid Number" },
  { value: "ENROLLED", label: "Enrolled (Admission Completed)" },
  { value: "CAMPUS_VISIT_DONE", label: "Campus Visit Done" },
  { value: "SENT_TO_CAMPUS", label: "Student & Parent Sent to Campus" },
];

export function leadStatusLabel(status: AdmissionLeadStatus): string {
  return LEAD_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function leadAgeingDays(createdAt: Date): string {
  const ms = Date.now() - createdAt.getTime();
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  return `${days}d`;
}

export function isPaidLeadStatus(status: AdmissionLeadStatus): boolean {
  return status === "PAYMENT_DONE" || status === "ENROLLED";
}

export function isReadyToPayStatus(status: AdmissionLeadStatus): boolean {
  return status === "READY_TO_PAY";
}

export function isRejectedLeadStatus(status: AdmissionLeadStatus): boolean {
  return status === "NOT_INTERESTED" || status === "WRONG_NUMBER";
}
