"use client";

import * as React from "react";
import { formatInr } from "@/lib/student-portal";
import { leadStatusLabel } from "@/lib/lead-status";
import { PaymentSplitNotice } from "@/components/payment-split-notice";
import { PORTAL_BRAND_NAME } from "@/components/portal-logo";
import type { AdmissionLeadStatus } from "@prisma/client";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay checkout"));
    document.body.appendChild(s);
  });
}

type Transaction = {
  transactionRef: string;
  amount: number;
  status: string;
  createdAt: string;
};

type PaymentPanelProps = {
  applicationId: string;
  universityName: string;
  applicationFee: number;
  paidRupees: number;
  remainingDue: number;
  panelState: "awaiting_approval" | "ready_to_pay" | "payment_done";
  leadStatus: string | null;
  razorpayConfigured: boolean;
  transactions: Transaction[];
  onPaid: () => Promise<void>;
};

export function StudentPaymentPanel({
  applicationId,
  universityName,
  applicationFee,
  paidRupees,
  remainingDue,
  panelState,
  leadStatus,
  razorpayConfigured,
  transactions,
  onPaid,
}: PaymentPanelProps) {
  const [payBusy, setPayBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [payRupees, setPayRupees] = React.useState("");

  React.useEffect(() => {
    if (remainingDue > 0) {
      setPayRupees(String(Math.round(remainingDue)));
    }
  }, [remainingDue, applicationId]);

  async function payMock() {
    const rupees = Number(String(payRupees).replace(/,/g, ""));
    if (!Number.isFinite(rupees) || rupees < 1) {
      setError("Enter a valid amount of at least ₹1.");
      return;
    }
    if (rupees > remainingDue) {
      setError(`Amount cannot exceed remaining due of ${formatInr(remainingDue)}.`);
      return;
    }
    setPayBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/student/application/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, method: "razorpay", amountRupees: rupees }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Payment failed");
        return;
      }
      await onPaid();
    } finally {
      setPayBusy(false);
    }
  }

  async function startRazorpay() {
    const rupees = Number(String(payRupees).replace(/,/g, ""));
    if (!Number.isFinite(rupees) || rupees < 1) {
      setError("Enter a valid amount of at least ₹1.");
      return;
    }
    if (rupees > remainingDue) {
      setError(`Amount cannot exceed remaining due of ${formatInr(remainingDue)}.`);
      return;
    }
    const amountPaise = Math.round(rupees * 100);

    setPayBusy(true);
    setError(null);
    try {
      const orderRes = await fetch("/api/student/application/razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, amountPaise }),
      });
      const orderData = (await orderRes.json().catch(() => ({}))) as {
        error?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
      };
      if (!orderRes.ok) {
        setError(orderData.error ?? "Could not create order");
        return;
      }

      await loadRazorpayScript();
      if (!window.Razorpay || !orderData.orderId || orderData.amount == null || !orderData.currency || !orderData.keyId) {
        setError("Razorpay checkout is unavailable.");
        return;
      }

      await new Promise<void>((resolve) => {
        const rzp = new window.Razorpay!({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: universityName,
          description: "Application fee",
          order_id: orderData.orderId,
          handler: async (response: Record<string, string>) => {
            try {
              const verifyRes = await fetch("/api/student/application/razorpay-verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  applicationId,
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
              await onPaid();
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment error");
    } finally {
      setPayBusy(false);
    }
  }

  function downloadReceipt(tx: Transaction) {
    const lines = [
      `${PORTAL_BRAND_NAME} — Payment Receipt`,
      `Transaction ref: ${tx.transactionRef}`,
      `Amount: ${formatInr(tx.amount)}`,
      `Status: ${tx.status}`,
      `Date: ${new Date(tx.createdAt).toLocaleString("en-IN")}`,
      `University: ${universityName}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${tx.transactionRef}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const latestSuccess = transactions.find((t) => t.status === "SUCCESS");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 text-sm">
        <p className="text-[var(--foreground-muted)]">
          Application fee: <strong className="text-[var(--foreground)]">{formatInr(applicationFee)}</strong>
          {" · "}
          Paid: <strong className="text-[var(--foreground)]">{formatInr(paidRupees)}</strong>
          {" · "}
          Remaining: <strong className="text-[var(--foreground)]">{formatInr(remainingDue)}</strong>
        </p>
        {leadStatus ? (
          <p className="mt-2 text-[var(--foreground-muted)]">
            Lead status:{" "}
            <strong className="text-[var(--foreground)]">
              {leadStatusLabel(leadStatus as AdmissionLeadStatus)}
            </strong>
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {panelState === "awaiting_approval" ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-6 text-center">
          <p className="font-semibold text-[var(--foreground)]">
            {applicationFee <= 0 ? "Application fee not configured" : "Awaiting consultant approval"}
          </p>
          <p className="mt-2 text-sm text-[var(--foreground-muted)]">
            {applicationFee <= 0
              ? "Your university has not set an application fee yet. Ask your consultant or Master Admin."
              : "Your consultant must mark your lead as Ready to Pay before you can pay online. You can still use the payment link from your consultant."}
          </p>
          <button
            type="button"
            disabled
            className="mt-4 rounded-lg bg-[var(--muted)] px-4 py-2 text-sm font-semibold text-[var(--foreground-muted)]"
          >
            Pay now {applicationFee > 0 ? formatInr(applicationFee) : ""}
          </button>
        </div>
      ) : null}

      {panelState === "ready_to_pay" ? (
        <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          {!razorpayConfigured ? (
            <p className="alert-notice">
              Razorpay keys are not configured — using simulated payments for development.
            </p>
          ) : null}
          <p className="text-sm text-[var(--foreground-muted)]">
            Pay any amount up to the remaining application fee ({formatInr(remainingDue)}).
          </p>
          <label className="block text-sm">
            <span className="font-medium">Amount (₹)</span>
            <input
              type="text"
              inputMode="decimal"
              value={payRupees}
              onChange={(e) => setPayRupees(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            />
          </label>
          {Number(String(payRupees).replace(/,/g, "")) > 0 ? (
            <PaymentSplitNotice
              amountRupees={Number(String(payRupees).replace(/,/g, ""))}
              note={
                razorpayConfigured
                  ? "Razorpay Route can transfer the university share automatically when enabled."
                  : undefined
              }
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {razorpayConfigured ? (
              <button
                type="button"
                disabled={payBusy}
                onClick={() => void startRazorpay()}
                className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Pay now — Razorpay
              </button>
            ) : (
              <button
                type="button"
                disabled={payBusy}
                onClick={() => void payMock()}
                className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Pay now (simulated)
              </button>
            )}
          </div>
        </div>
      ) : null}

      {panelState === "payment_done" ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6">
          <p className="font-semibold text-[var(--foreground)]">Payment completed</p>
          <p className="mt-2 text-sm text-[var(--foreground-muted)]">
            Your application fee of {formatInr(applicationFee)} has been recorded. Thank you!
          </p>
          {latestSuccess ? (
            <button
              type="button"
              onClick={() => downloadReceipt(latestSuccess)}
              className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold"
            >
              Download Receipt
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function UniversitySelector({
  applications,
  selectedId,
  onChange,
}: {
  applications: { id: string; universityName: string; programmeName: string }[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  if (applications.length <= 1) return null;
  return (
    <label className="block text-sm">
      <span className="font-medium text-[var(--foreground-muted)]">University</span>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
      >
        {applications.map((a) => (
          <option key={a.id} value={a.id}>
            {a.universityName} — {a.programmeName}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StepIndicator({ step }: { step: number }) {
  const steps = ["University & Programme", "Personal Details", "Payment"];
  return (
    <ol className="mt-8 flex flex-wrap gap-3 text-sm">
      {steps.map((label, i) => {
        const n = i + 1;
        return (
          <li
            key={label}
            className={step === n ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}
          >
            {n}. {label}
          </li>
        );
      })}
    </ol>
  );
}

export const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2";

export const cardClass = "mt-8 space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6";
