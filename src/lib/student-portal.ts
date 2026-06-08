import type { AdmissionLeadStatus, LeadPayment, Prisma } from "@prisma/client";
import { isPaidLeadStatus } from "@/lib/lead-status";

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

export function decimalToNumber(value: DecimalLike): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatInr(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

type FeeSource = {
  applicationFee?: DecimalLike;
};

type StreamFeeSource = FeeSource;

/** Amount due at Ready to Pay — application fee only (never tuition, registration, or college fee). */
export function resolveApplicationFeeRupees(
  stream: StreamFeeSource | null | undefined,
  university: FeeSource | null | undefined,
): number {
  return (
    decimalToNumber(stream?.applicationFee) ??
    decimalToNumber(university?.applicationFee) ??
    0
  );
}

export function minHostelFeeRupees(
  hostelFees: { amount: DecimalLike }[] | null | undefined,
): number | null {
  if (!hostelFees?.length) return null;
  let min: number | null = null;
  for (const h of hostelFees) {
    const n = decimalToNumber(h.amount);
    if (n == null || n <= 0) continue;
    min = min == null ? n : Math.min(min, n);
  }
  return min;
}

export function sumSuccessfulPaymentsRupees(payments: Pick<LeadPayment, "amount" | "status">[]): number {
  return payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + (decimalToNumber(p.amount) ?? 0), 0);
}

export function remainingApplicationDueRupees(applicationFee: number, paid: number): number {
  return Math.max(0, applicationFee - paid);
}

export function isApplicationFullyPaid(applicationFee: number, paid: number): boolean {
  return applicationFee > 0 && paid >= applicationFee;
}

export type StudentPaymentPanelState = "awaiting_approval" | "ready_to_pay" | "payment_done";

export function studentPaymentPanelState(
  leadStatus: AdmissionLeadStatus | null | undefined,
  applicationFee: number,
  paidRupees: number,
): StudentPaymentPanelState {
  if (isApplicationFullyPaid(applicationFee, paidRupees) || isPaidLeadStatus(leadStatus ?? "NEW_LEAD")) {
    return "payment_done";
  }
  if (leadStatus === "READY_TO_PAY") {
    return "ready_to_pay";
  }
  return "awaiting_approval";
}

export function formatDateOnly(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isoToDateInputValue(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
