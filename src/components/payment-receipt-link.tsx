"use client";

import { downloadPaymentReceiptHtml } from "@/lib/payment-receipt-html";

type Props = {
  transactionRef: string;
  amount: string;
  studentName: string;
  universityName: string;
  createdAt: string;
};

function formatInr(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function PaymentReceiptLink({
  transactionRef,
  amount,
  studentName,
  universityName,
  createdAt,
}: Props) {
  function downloadReceipt() {
    downloadPaymentReceiptHtml({
      transactionRef,
      amountLabel: formatInr(amount),
      status: "SUCCESS",
      paidAt: createdAt,
      universityName,
      studentName,
    });
  }

  return (
    <button
      type="button"
      onClick={downloadReceipt}
      className="inline-flex items-center gap-1 text-[var(--primary)] underline-offset-2 hover:underline"
    >
      Receipt
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
