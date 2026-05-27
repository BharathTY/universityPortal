"use client";

import * as React from "react";

type PaymentCollectorModalProps = {
  open: boolean;
  leadName: string;
  amountLabel: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onMarkPaid: (payload: {
    paymentMethod: "UPI" | "CARD";
    upiId?: string;
    cardHolderName?: string;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvv?: string;
  }) => void | Promise<void>;
};

export function PaymentCollectorModal({
  open,
  leadName,
  amountLabel,
  busy,
  error,
  onClose,
  onMarkPaid,
}: PaymentCollectorModalProps) {
  const [method, setMethod] = React.useState<"UPI" | "CARD">("UPI");
  const [upiId, setUpiId] = React.useState("");
  const [cardHolderName, setCardHolderName] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [cardExpiry, setCardExpiry] = React.useState("");
  const [cardCvv, setCardCvv] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setMethod("UPI");
    setUpiId("");
    setCardHolderName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Dismiss"
        onClick={() => (busy ? undefined : onClose())}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-collector-title"
        className="relative z-[101] w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
      >
        <h2 id="payment-collector-title" className="text-lg font-semibold text-[var(--foreground)]">
          Collect payment
        </h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          {leadName} · {amountLabel}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMethod("UPI")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              method === "UPI"
                ? "bg-[var(--accent-blue)] text-white"
                : "border border-[var(--border)] text-[var(--foreground)]"
            }`}
          >
            UPI
          </button>
          <button
            type="button"
            onClick={() => setMethod("CARD")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              method === "CARD"
                ? "bg-[var(--accent-blue)] text-white"
                : "border border-[var(--border)] text-[var(--foreground)]"
            }`}
          >
            Card
          </button>
        </div>

        {method === "UPI" ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/20 px-4 py-8">
              <div className="flex h-36 w-36 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-xs text-[var(--foreground-muted)]">
                UPI QR
              </div>
              <p className="mt-3 text-xs text-[var(--foreground-muted)]">Scan to pay (placeholder)</p>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)]">UPI ID</label>
              <input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="name@upi"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Cardholder name</label>
              <input
                value={cardHolderName}
                onChange={(e) => setCardHolderName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Card number</label>
              <input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                inputMode="numeric"
                placeholder="4111 1111 1111 1111"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)]">Expiry</label>
              <input
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                placeholder="MM/YY"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)]">CVV</label>
              <input
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value)}
                inputMode="numeric"
                placeholder="123"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void onMarkPaid({
                paymentMethod: method,
                upiId: upiId.trim() || undefined,
                cardHolderName: cardHolderName.trim() || undefined,
                cardNumber: cardNumber.trim() || undefined,
                cardExpiry: cardExpiry.trim() || undefined,
                cardCvv: cardCvv.trim() || undefined,
              })
            }
            className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
          >
            {busy ? "Processing…" : "Mark Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}
