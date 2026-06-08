"use client";

import * as React from "react";
import { formatInr } from "@/lib/student-portal";

type SplitData = {
  universityPercent: number;
  platformPercent: number;
  platformLabel: string;
  universityShareRupees: number;
  platformShareRupees: number;
};

export function PaymentSplitNotice({
  amountRupees,
  className = "",
  note,
}: {
  amountRupees: number;
  className?: string;
  note?: string;
}) {
  const [split, setSplit] = React.useState<SplitData | null>(null);

  React.useEffect(() => {
    if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
      setSplit(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/payment-split-config?amountRupees=${encodeURIComponent(String(amountRupees))}`)
      .then((r) => r.json())
      .then((data: { split?: SplitData }) => {
        if (!cancelled && data.split) setSplit(data.split);
      })
      .catch(() => {
        if (!cancelled) setSplit(null);
      });
    return () => {
      cancelled = true;
    };
  }, [amountRupees]);

  if (!split) return null;

  return (
    <div
      className={`rounded-lg border border-[var(--border)] bg-[var(--muted)]/25 px-3 py-2 text-xs text-[var(--foreground-muted)] ${className}`}
    >
      <p className="font-medium text-[var(--foreground)]">Fee split (configured)</p>
      <p className="mt-1">
        {split.universityPercent}% → University ({formatInr(split.universityShareRupees)}) ·{" "}
        {split.platformPercent}% → {split.platformLabel} ({formatInr(split.platformShareRupees)})
      </p>
      {note ? <p className="mt-1">{note}</p> : null}
    </div>
  );
}
