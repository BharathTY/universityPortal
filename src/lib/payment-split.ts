/**
 * Registration fee split between university and QSpiders (platform).
 * Configure via .env — percentages must sum to 100.
 */

export type PaymentSplitConfig = {
  universityPercent: number;
  platformPercent: number;
  platformLabel: string;
};

export type PaymentSplitAmounts = {
  totalRupees: number;
  universityShareRupees: number;
  platformShareRupees: number;
  universityPercent: number;
  platformPercent: number;
  platformLabel: string;
};

const DEFAULT_UNIVERSITY_PERCENT = 70;
const DEFAULT_PLATFORM_PERCENT = 30;

function parsePercent(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) return fallback;
  return n;
}

/** Read split percentages from environment (must sum to 100). */
export function getPaymentSplitConfig(): PaymentSplitConfig {
  const universityPercent = parsePercent(process.env.PAYMENT_UNIVERSITY_SHARE_PERCENT, DEFAULT_UNIVERSITY_PERCENT);
  const platformPercent = parsePercent(
    process.env.PAYMENT_QSPIDERS_SHARE_PERCENT,
    DEFAULT_PLATFORM_PERCENT,
  );

  if (Math.abs(universityPercent + platformPercent - 100) > 0.001) {
    return {
      universityPercent: DEFAULT_UNIVERSITY_PERCENT,
      platformPercent: DEFAULT_PLATFORM_PERCENT,
      platformLabel: process.env.PAYMENT_PLATFORM_LABEL?.trim() || "QSpiders",
    };
  }

  return {
    universityPercent,
    platformPercent,
    platformLabel: process.env.PAYMENT_PLATFORM_LABEL?.trim() || "QSpiders",
  };
}

/** Split a total amount in rupees (2 decimal places). Remainder goes to university. */
export function splitPaymentRupees(totalRupees: number): PaymentSplitAmounts {
  const config = getPaymentSplitConfig();
  const total = Math.max(0, Math.round(totalRupees * 100) / 100);
  if (total <= 0) {
    return {
      totalRupees: 0,
      universityShareRupees: 0,
      platformShareRupees: 0,
      universityPercent: config.universityPercent,
      platformPercent: config.platformPercent,
      platformLabel: config.platformLabel,
    };
  }

  const platformShareRupees =
    Math.round(((total * config.platformPercent) / 100) * 100) / 100;
  const universityShareRupees = Math.round((total - platformShareRupees) * 100) / 100;

  return {
    totalRupees: total,
    universityShareRupees,
    platformShareRupees,
    universityPercent: config.universityPercent,
    platformPercent: config.platformPercent,
    platformLabel: config.platformLabel,
  };
}

export function splitPaymentPaise(totalPaise: number): {
  universitySharePaise: number;
  platformSharePaise: number;
} {
  const rupees = splitPaymentRupees(totalPaise / 100);
  return {
    universitySharePaise: Math.round(rupees.universityShareRupees * 100),
    platformSharePaise: Math.round(rupees.platformShareRupees * 100),
  };
}

/** Razorpay Route linked account for automatic university transfer (optional). */
export function resolveUniversityRazorpayLinkedAccountId(
  universityLinkedAccountId: string | null | undefined,
): string | null {
  const fromUni = universityLinkedAccountId?.trim();
  if (fromUni) return fromUni;
  const fromEnv = process.env.RAZORPAY_UNIVERSITY_LINKED_ACCOUNT_ID?.trim();
  return fromEnv || null;
}

export function isRazorpaySplitEnabled(): boolean {
  return process.env.RAZORPAY_ROUTE_SPLIT_ENABLED === "true";
}
