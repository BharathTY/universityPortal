"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { tryClosePaymentWindow } from "@/lib/lead-payment-window";

export default function StudentUpiPayCompletePage({ params }: { params: Promise<{ leadId: string }> }) {
  const searchParams = useSearchParams();
  const [leadId, setLeadId] = React.useState("");
  const [status, setStatus] = React.useState<"working" | "done" | "error">("working");
  const [message, setMessage] = React.useState("Recording your payment…");

  const token = searchParams.get("t")?.trim() ?? "";

  React.useEffect(() => {
    void params.then((p) => setLeadId(p.leadId));
  }, [params]);

  React.useEffect(() => {
    if (!leadId || !token) return;

    let cancelled = false;

    async function run() {
      try {
        const infoRes = await fetch(
          `/api/pay/lead/${encodeURIComponent(leadId)}?t=${encodeURIComponent(token)}`,
        );
        const info = (await infoRes.json().catch(() => ({}))) as {
          upiId?: string | null;
          error?: string;
        };
        if (cancelled) return;
        if (!infoRes.ok || !info.upiId) {
          setStatus("error");
          setMessage(info.error ?? "Could not verify payment link");
          return;
        }

        const confirmRes = await fetch(`/api/pay/lead/${encodeURIComponent(leadId)}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, upiId: info.upiId }),
        });
        const confirmJson = (await confirmRes.json().catch(() => ({}))) as { error?: string };
        if (cancelled) return;

        if (!confirmRes.ok) {
          setStatus("error");
          setMessage(confirmJson.error ?? "Could not record payment");
          return;
        }

        setStatus("done");
        setMessage("Payment recorded. Closing…");
        tryClosePaymentWindow(leadId);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Something went wrong. Please try again.");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [leadId, token]);

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p
        className={`text-sm ${
          status === "error" ? "text-red-600" : "text-[var(--foreground-muted)]"
        }`}
      >
        {message}
      </p>
      <p id="pay-done-fallback" hidden className="mt-4 text-sm text-[var(--foreground)]">
        Payment recorded. You can close this tab.
      </p>
    </main>
  );
}
