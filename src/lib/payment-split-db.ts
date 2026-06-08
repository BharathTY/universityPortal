import { Prisma } from "@prisma/client";
import { splitPaymentRupees, type PaymentSplitAmounts } from "@/lib/payment-split";

export function splitToDecimals(split: PaymentSplitAmounts): {
  universityShare: Prisma.Decimal;
  platformShare: Prisma.Decimal;
} {
  return {
    universityShare: new Prisma.Decimal(split.universityShareRupees.toFixed(2)),
    platformShare: new Prisma.Decimal(split.platformShareRupees.toFixed(2)),
  };
}

export function splitAmountFields(totalRupees: number): {
  universityShare: Prisma.Decimal;
  platformShare: Prisma.Decimal;
} {
  return splitToDecimals(splitPaymentRupees(totalRupees));
}

export function formatSplitSummary(totalRupees: number): string {
  const s = splitPaymentRupees(totalRupees);
  if (s.totalRupees <= 0) return "";
  return `University ${s.universityPercent}% (₹${s.universityShareRupees.toLocaleString("en-IN")}) · ${s.platformLabel} ${s.platformPercent}% (₹${s.platformShareRupees.toLocaleString("en-IN")})`;
}
