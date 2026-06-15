import type { AdmissionLeadStatus } from "@prisma/client";

/** Pre-payment statuses shown in the lead status dropdown before payment is collected. */
export const PRE_PAYMENT_LEAD_STATUS_OPTIONS: { value: AdmissionLeadStatus; label: string }[] = [
  { value: "NEW_LEAD", label: "New Lead" },
  { value: "INTERESTED", label: "Interested" },
  { value: "NOT_INTERESTED", label: "Not Interested" },
  { value: "CALL_BACK", label: "Call Back" },
  { value: "READY_TO_PAY", label: "Ready to Pay" },
  { value: "IN_FUTURE", label: "In Future" },
  { value: "RNR", label: "RNR" },
  { value: "SWITCH_OFF", label: "Switch Off" },
  { value: "WRONG_NUMBER", label: "Wrong Number / Invalid Number" },
];

/** Post-payment statuses — hidden until the lead reaches the relevant stage. */
export const POST_PAYMENT_LEAD_STATUS_OPTIONS: { value: AdmissionLeadStatus; label: string }[] = [
  { value: "PAYMENT_DONE", label: "Payment Done" },
  { value: "ENROLLED", label: "Enrolled (Admission Completed)" },
  { value: "CAMPUS_VISIT_DONE", label: "Campus Visit Done" },
];

/** All statuses for filter dropdowns and labels. */
export const LEAD_STATUS_OPTIONS: { value: AdmissionLeadStatus; label: string }[] = [
  ...PRE_PAYMENT_LEAD_STATUS_OPTIONS,
  ...POST_PAYMENT_LEAD_STATUS_OPTIONS,
  { value: "SENT_TO_CAMPUS", label: "Student & Parent Sent to Campus" },
];

const POST_PAYMENT_SET = new Set<AdmissionLeadStatus>(
  POST_PAYMENT_LEAD_STATUS_OPTIONS.map((o) => o.value),
);

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

/** Status options visible in the per-row status dropdown for the current lead state. */
export function leadStatusOptionsForLead(current: AdmissionLeadStatus): typeof LEAD_STATUS_OPTIONS {
  const currentStrict = strictIndex(current);
  return LEAD_STATUS_OPTIONS.filter((opt) => isLeadStatusOptionVisible(current, opt.value, currentStrict));
}

/** Post-payment statuses stay hidden until the lead has reached the matching workflow stage. */
export function isLeadStatusOptionVisible(
  current: AdmissionLeadStatus,
  option: AdmissionLeadStatus,
  currentStrict: number | null = strictIndex(current),
): boolean {
  if (!POST_PAYMENT_SET.has(option)) return true;

  const optionStrict = strictIndex(option);
  if (optionStrict === null) return true;

  if (currentStrict === null) {
    return option === "PAYMENT_DONE" && current === "READY_TO_PAY";
  }

  return optionStrict <= currentStrict + 1;
}

export function leadStatusLabel(status: AdmissionLeadStatus): string {
  return LEAD_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function leadAgeingDays(createdAt: Date): string {
  const ms = Date.now() - createdAt.getTime();
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  return days === 1 ? "1 day" : `${days} days`;
}

/** DD-MM-YYYY hh:mm AM/PM for ageing tooltip. */
export function formatLeadCreatedAt(createdAt: Date): string {
  const d = createdAt;
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${day}-${month}-${year} ${pad(hours)}:${minutes} ${ampm}`;
}

export function isPaidLeadStatus(status: AdmissionLeadStatus): boolean {
  return status === "PAYMENT_DONE" || status === "ENROLLED" || status === "CAMPUS_VISIT_DONE";
}

export function isReadyToPayStatus(status: AdmissionLeadStatus): boolean {
  return status === "READY_TO_PAY";
}

export function isRejectedLeadStatus(status: AdmissionLeadStatus): boolean {
  return status === "NOT_INTERESTED" || status === "WRONG_NUMBER";
}
