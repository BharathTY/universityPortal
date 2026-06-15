"use client";

import { PORTAL_BRAND_NAME } from "@/components/portal-logo";

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
    const lines = [
      `${PORTAL_BRAND_NAME} — Payment Receipt`,
      `Transaction ID: ${transactionRef}`,
      `Student: ${studentName}`,
      `University: ${universityName}`,
      `Amount: ${formatInr(amount)}`,
      `Status: SUCCESS`,
      `Date: ${new Date(createdAt).toLocaleString("en-IN")}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${transactionRef}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
