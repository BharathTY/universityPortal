"use client";

import * as React from "react";
import QRCode from "qrcode";
import { PaymentSplitNotice } from "@/components/payment-split-notice";

type PaymentCollectorModalProps = {
  open: boolean;
  leadName: string;
  studentEmail: string;
  universityName: string;
  /** University UPI ID — student pays this account, not the consultant. */
  universityUpiId: string | null;
  amountLabel: string;
  amountRupees?: number;
  hasStudentPortal: boolean;
  studentPortalUrl: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirmStudentPaid: (payload: { paymentMethod: "UPI" | "CASH"; upiId?: string }) => void | Promise<void>;
};

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
  studentEmail,
  universityName,
  universityUpiId,
  amountLabel,
  amountRupees,
  hasStudentPortal,
  studentPortalUrl,
  busy,
  error,
  onClose,
  onConfirmStudentPaid,
}: PaymentCollectorModalProps) {
  const [method, setMethod] = React.useState<"UPI" | "ONLINE">("UPI");
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setMethod("UPI");
    setQrDataUrl(null);
  }, [open]);

  React.useEffect(() => {
    if (!open || method !== "UPI" || !universityUpiId) return;
    let cancelled = false;
    const uri = buildUpiUri(universityUpiId, amountRupees, universityName);
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
  }, [open, method, universityUpiId, amountRupees, universityName]);

  if (!open) return null;

  const loginUrl = `${studentPortalUrl}/login?email=${encodeURIComponent(studentEmail)}`;

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
          {leadName} · {amountLabel} · {universityName}
        </p>
        <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          The <strong>student</strong> pays the university. You only confirm after payment is received — do not pay
          from your own account.
        </p>

        {amountRupees != null && amountRupees > 0 ? (
          <PaymentSplitNotice
            className="mt-3"
            amountRupees={amountRupees}
            note={
              method === "ONLINE"
                ? "Online Razorpay can auto-transfer the university share when Route is enabled in .env."
                : "In-person UPI pays the full amount to the university UPI; platform share is recorded for settlement."
            }
          />
        ) : null}

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
            UPI (in person)
          </button>
          <button
            type="button"
            onClick={() => setMethod("ONLINE")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              method === "ONLINE"
                ? "bg-[var(--accent-blue)] text-white"
                : "border border-[var(--border)] text-[var(--foreground)]"
            }`}
          >
            Student portal
          </button>
        </div>

        {method === "UPI" ? (
          <div className="mt-5 space-y-4">
            {!universityUpiId ? (
              <p className="text-sm text-red-600">
                This university has no payment UPI ID configured. Ask Master Admin to set it on the university record,
                or use the Student portal tab.
              </p>
            ) : (
              <>
                <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/20 px-4 py-6">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="University UPI payment QR code for student"
                      className="h-44 w-44 rounded-lg bg-white p-2"
                    />
                  ) : (
                    <div className="flex h-44 w-44 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-xs text-[var(--foreground-muted)]">
                      Generating QR…
                    </div>
                  )}
                  <p className="mt-3 text-center text-xs text-[var(--foreground-muted)]">
                    Ask <strong>{leadName}</strong> to scan and pay <strong>{universityName}</strong>
                  </p>
                  <p className="mt-1 font-mono text-xs text-[var(--foreground)]">{universityUpiId}</p>
                </div>
                <p className="text-xs text-[var(--foreground-muted)]">
                  After the student completes UPI payment on their phone, click Confirm below.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-4 text-sm text-[var(--foreground-muted)]">
            <p>
              The student pays online from their own account after signing in to the student portal.
            </p>
            <dl className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 text-xs">
              <div>
                <dt className="text-[var(--foreground-muted)]">Student email</dt>
                <dd className="font-medium text-[var(--foreground)]">{studentEmail}</dd>
              </div>
              <div className="mt-2">
                <dt className="text-[var(--foreground-muted)]">Portal status</dt>
                <dd className="font-medium text-[var(--foreground)]">
                  {hasStudentPortal ? "Account ready — student can sign in and pay" : "Creating account… refresh if needed"}
                </dd>
              </div>
            </dl>
            <a
              href={loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
            >
              Open student login (share with student)
            </a>
            <p className="text-xs">
              Student path: sign in → My Application → Pay with Razorpay (or simulated pay in dev). Status updates
              automatically when they pay.
            </p>
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
          {method === "UPI" && universityUpiId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void onConfirmStudentPaid({
                  paymentMethod: "UPI",
                  upiId: universityUpiId,
                })
              }
              className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
            >
              {busy ? "Saving…" : "Confirm student paid"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
