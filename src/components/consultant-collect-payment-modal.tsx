"use client";

import * as React from "react";
import { loadRazorpayScript } from "@/components/student/student-portal-ui";
import { PaymentSplitNotice } from "@/components/payment-split-notice";
import { parseAmountRupees } from "@/lib/payment-amount";

type Props = {
  open: boolean;
  studentName: string;
  universityName: string;
  programName: string;
  /** Suggested default amount (application fee) — consultant can edit. */
  defaultAmount?: string;
  leadId: string;
  razorpayConfigured: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

export function ConsultantCollectPaymentModal({
  open,
  studentName,
  universityName,
  programName,
  defaultAmount = "",
  leadId,
  razorpayConfigured,
  busy: externalBusy,
  error: externalError,
  onClose,
  onSuccess,
}: Props) {
  const [amount, setAmount] = React.useState(defaultAmount);
  const [remarks, setRemarks] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isBusy = busy || Boolean(externalBusy);
  const displayError = error ?? externalError;

  React.useEffect(() => {
    if (!open) return;
    setAmount(defaultAmount);
    setRemarks("");
    setFieldErrors({});
    setError(null);
  }, [open, defaultAmount, leadId]);

  function validate(): number | null {
    const parsed = parseAmountRupees(amount);
    if (!parsed.ok) {
      setFieldErrors({ amount: parsed.error });
      return null;
    }
    setFieldErrors({});
    return parsed.value;
  }

  async function paySimulated(rupees: number) {
    const res = await fetch(`/api/consultant/leads/${leadId}/collect-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountRupees: rupees, remarks: remarks.trim() || null }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; fieldErrors?: Record<string, string[]> };
    if (!res.ok) {
      const fe = data.fieldErrors?.amount?.[0];
      if (fe) setFieldErrors({ amount: fe });
      setError(data.error ?? "Could not record payment");
      return false;
    }
    return true;
  }

  async function startRazorpay(rupees: number) {
    const orderRes = await fetch(`/api/consultant/leads/${leadId}/razorpay-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountRupees: rupees, remarks: remarks.trim() || null }),
    });
    const orderData = (await orderRes.json().catch(() => ({}))) as {
      error?: string;
      fieldErrors?: Record<string, string[]>;
      orderId?: string;
      amount?: number;
      currency?: string;
      keyId?: string;
    };
    if (!orderRes.ok) {
      const fe = orderData.fieldErrors?.amount?.[0];
      if (fe) setFieldErrors({ amount: fe });
      setError(orderData.error ?? "Could not create payment order");
      return false;
    }

    await loadRazorpayScript();
    if (
      !window.Razorpay ||
      !orderData.orderId ||
      orderData.amount == null ||
      !orderData.currency ||
      !orderData.keyId
    ) {
      setError("Razorpay checkout is unavailable.");
      return false;
    }

    let paid = false;

    await new Promise<void>((resolve) => {
      const rzp = new window.Razorpay!({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: universityName,
        description: `Application fee — ${programName}`,
        order_id: orderData.orderId,
        prefill: { name: studentName },
        handler: async (response: Record<string, string>) => {
          try {
            const verifyRes = await fetch(`/api/consultant/leads/${leadId}/razorpay-verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amountRupees: rupees,
                remarks: remarks.trim() || null,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyJson = (await verifyRes.json().catch(() => ({}))) as { error?: string };
            if (!verifyRes.ok) {
              setError(verifyJson.error ?? "Payment verification failed");
              return;
            }
            paid = true;
          } catch (e) {
            setError(e instanceof Error ? e.message : "Payment error");
          } finally {
            resolve();
          }
        },
        modal: { ondismiss: () => resolve() },
      });
      rzp.open();
    });

    return paid;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const rupees = validate();
    if (rupees == null) return;

    setBusy(true);
    try {
      const ok = razorpayConfigured ? await startRazorpay(rupees) : await paySimulated(rupees);
      if (ok) {
        await onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const amountNum = Number(String(amount).replace(/,/g, ""));
  const showSplit = Number.isFinite(amountNum) && amountNum > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Dismiss"
        onClick={() => (isBusy ? undefined : onClose())}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consultant-collect-payment-title"
        className="relative z-[101] w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
      >
        <h2 id="consultant-collect-payment-title" className="text-lg font-semibold text-[var(--foreground)]">
          Collect payment
        </h2>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-4" noValidate>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)]">Student name</label>
            <input
              readOnly
              value={studentName}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-sm text-[var(--foreground-muted)]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)]">University name</label>
            <input
              readOnly
              value={universityName}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-sm text-[var(--foreground-muted)]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)]">Program name</label>
            <input
              readOnly
              value={programName}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-sm text-[var(--foreground-muted)]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)]">Amount *</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setFieldErrors((f) => {
                  const n = { ...f };
                  delete n.amount;
                  return n;
                });
              }}
              placeholder="0.00"
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm ${
                fieldErrors.amount ? "border-red-500" : "border-[var(--border)]"
              }`}
              aria-invalid={Boolean(fieldErrors.amount)}
            />
            {fieldErrors.amount ? <p className="mt-1 text-xs text-red-600">{fieldErrors.amount}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)]">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </div>

          {showSplit ? (
            <PaymentSplitNotice
              amountRupees={amountNum}
              note={
                razorpayConfigured
                  ? "Razorpay Route can transfer the university share when enabled."
                  : "Simulated payment for development — configure Razorpay keys for live checkout."
              }
            />
          ) : null}

          {!razorpayConfigured ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Razorpay is not configured — payment will be recorded as simulated (development only).
            </p>
          ) : null}

          {displayError ? <p className="text-sm text-red-600">{displayError}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isBusy ? "Processing…" : razorpayConfigured ? "Pay with Razorpay" : "Record payment (dev)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}
