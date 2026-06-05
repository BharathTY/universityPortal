"use client";

import * as React from "react";
import QRCode from "qrcode";

type PaymentCollectorModalProps = {
  open: boolean;
  leadName: string;
  amountLabel: string;
  amountRupees?: number;
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

const DEFAULT_UPI_ID = process.env.NEXT_PUBLIC_COLLECT_UPI_ID?.trim() || "eduversity@upi";

function buildUpiUri(upiId: string, amountRupees: number | undefined, payeeName: string): string {
  const params = new URLSearchParams();
  params.set("pa", upiId);
  params.set("pn", payeeName.slice(0, 50));
  if (amountRupees != null && Number.isFinite(amountRupees) && amountRupees > 0) {
    params.set("am", amountRupees.toFixed(2));
  }
  params.set("cu", "INR");
  return `upi://pay?${params.toString()}`;
}

export function PaymentCollectorModal({
  open,
  leadName,
  amountLabel,
  amountRupees,
  busy,
  error,
  onClose,
  onMarkPaid,
}: PaymentCollectorModalProps) {
  const [method, setMethod] = React.useState<"UPI" | "CARD">("UPI");
  const [upiId, setUpiId] = React.useState("");
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [scanBusy, setScanBusy] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [cardHolderName, setCardHolderName] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [cardExpiry, setCardExpiry] = React.useState("");
  const [cardCvv, setCardCvv] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setMethod("UPI");
    setUpiId("");
    setQrDataUrl(null);
    setScanBusy(false);
    setScanError(null);
    setCardHolderName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
  }, [open]);

  React.useEffect(() => {
    if (!open || method !== "UPI") return;
    let cancelled = false;
    const targetUpi = upiId.trim() || DEFAULT_UPI_ID;
    const uri = buildUpiUri(targetUpi, amountRupees, leadName);
    void QRCode.toDataURL(uri, { width: 280, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, method, upiId, amountRupees, leadName]);

  async function scanQrCode() {
    setScanError(null);
    if (typeof window === "undefined") return;

    type BarcodeDetectorCtor = new (opts: { formats: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<{ rawValue?: string }[]>;
    };
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Detector) {
      setScanError("QR scanning is not supported in this browser. Enter UPI ID manually.");
      return;
    }

    setScanBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const detector = new Detector({ formats: ["qr_code"] });
      const started = Date.now();
      let found: string | null = null;
      while (Date.now() - started < 15000) {
        const codes = await detector.detect(video);
        const raw = codes[0]?.rawValue;
        if (raw) {
          found = raw;
          break;
        }
        await new Promise((r) => setTimeout(r, 250));
      }

      stream.getTracks().forEach((t) => t.stop());

      if (!found) {
        setScanError("No QR code detected. Try again or enter UPI ID manually.");
        return;
      }

      const match = found.match(/[?&]pa=([^&]+)/i);
      if (match?.[1]) {
        setUpiId(decodeURIComponent(match[1]));
      } else if (found.includes("@")) {
        setUpiId(found.trim());
      } else {
        setScanError("Could not read a UPI ID from the scanned code.");
      }
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Camera access failed");
    } finally {
      setScanBusy(false);
    }
  }

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
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/20 px-4 py-6">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="UPI payment QR code" className="h-44 w-44 rounded-lg bg-white p-2" />
              ) : (
                <div className="flex h-44 w-44 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-xs text-[var(--foreground-muted)]">
                  Generating QR…
                </div>
              )}
              <p className="mt-3 text-xs text-[var(--foreground-muted)]">
                Scan to pay via UPI · {upiId.trim() || DEFAULT_UPI_ID}
              </p>
              <button
                type="button"
                disabled={busy || scanBusy}
                onClick={() => void scanQrCode()}
                className="mt-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
              >
                {scanBusy ? "Scanning…" : "Scan payer QR / UPI code"}
              </button>
              {scanError ? <p className="mt-2 text-xs text-red-600">{scanError}</p> : null}
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)]">UPI ID</label>
              <input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder={DEFAULT_UPI_ID}
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
                upiId: upiId.trim() || DEFAULT_UPI_ID,
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
