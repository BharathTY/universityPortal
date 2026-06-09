"use client";

import * as React from "react";
import QRCode from "qrcode";
import { useSearchParams } from "next/navigation";
import { buildUpiPayUri } from "@/lib/upi-pay-uri";
import { leadPaymentCompleteUrl } from "@/lib/lead-payment-share-token";
import { tryClosePaymentWindow } from "@/lib/lead-payment-window";

type PayInfo = {
  studentName: string;
  universityName: string;
  amountRupees: number;
  upiId: string | null;
  admissionStatus: string;
};

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function StudentUpiPayPage({ params }: { params: Promise<{ leadId: string }> }) {
  const searchParams = useSearchParams();
  const [leadId, setLeadId] = React.useState("");
  const [info, setInfo] = React.useState<PayInfo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const token = searchParams.get("t")?.trim() ?? "";

  React.useEffect(() => {
    void params.then((p) => setLeadId(p.leadId));
  }, [params]);

  React.useEffect(() => {
    if (!leadId || !token) return;
    setError(null);
    void fetch(`/api/pay/lead/${encodeURIComponent(leadId)}?t=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as PayInfo & { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not load payment");
          return;
        }
        setInfo(data);
      })
      .catch(() => setError("Could not load payment"));
  }, [leadId, token]);

  const completeUrl = leadId && token ? leadPaymentCompleteUrl(leadId, token) : undefined;

  React.useEffect(() => {
    if (!info?.upiId || !info.amountRupees) return;
    let cancelled = false;
    const uri = buildUpiPayUri({
      upiId: info.upiId,
      amountRupees: info.amountRupees,
      payeeName: info.universityName,
      returnUrl: completeUrl,
    });
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
  }, [info, completeUrl]);

  async function confirmPaid() {
    if (!leadId || !token || !info?.upiId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pay/lead/${encodeURIComponent(leadId)}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, upiId: info.upiId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not record payment");
        return;
      }
      tryClosePaymentWindow(leadId);
      setTimeout(() => {
        const el = document.getElementById("pay-done-fallback");
        if (el) el.hidden = false;
      }, 300);
    } finally {
      setBusy(false);
    }
  }

  function openUpiApp() {
    if (!info?.upiId) return;
    window.location.href = buildUpiPayUri({
      upiId: info.upiId,
      amountRupees: info.amountRupees,
      payeeName: info.universityName,
      returnUrl: completeUrl,
    });
  }

  if (!token) {
    return (
      <main className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-sm text-red-600">Invalid payment link.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">Pay application fee</h1>
      {info ? (
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          {info.studentName} · {info.universityName} · {formatInr(info.amountRupees)}
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {info?.upiId && info.amountRupees > 0 ? (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/20 px-4 py-6">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="UPI QR code" className="h-52 w-52 rounded-lg bg-white p-2" />
            ) : (
              <div className="flex h-52 w-52 items-center justify-center text-xs text-[var(--foreground-muted)]">
                Generating QR…
              </div>
            )}
            <p className="mt-3 font-mono text-xs">{info.upiId}</p>
          </div>
          <button
            type="button"
            onClick={openUpiApp}
            className="w-full rounded-lg bg-[var(--accent-blue)] px-4 py-3 text-sm font-semibold text-white"
          >
            Open UPI app to pay
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirmPaid()}
            className="w-full rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Saving…" : "I have paid — close"}
          </button>
          <p className="text-xs text-[var(--foreground-muted)]">
            After UPI payment, your browser may return here automatically and close this page.
          </p>
        </div>
      ) : info ? (
        <p className="mt-4 text-sm text-red-600">Application fee or UPI ID is not configured for this programme.</p>
      ) : (
        <p className="mt-4 text-sm text-[var(--foreground-muted)]">Loading…</p>
      )}
    </main>
  );
}
