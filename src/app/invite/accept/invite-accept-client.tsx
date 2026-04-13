"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function InviteAcceptClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = React.useState<"idle" | "loading" | "ok" | "err" | "missing">("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  async function accept() {
    if (!token) {
      setStatus("missing");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; email?: string };
      if (!res.ok) {
        setStatus("err");
        setMessage(data.error || "Could not accept invitation");
        return;
      }
      setStatus("ok");
      setMessage(data.email ?? null);
    } catch {
      setStatus("err");
      setMessage("Something went wrong");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Student invitation</h1>
        <p className="mt-2 text-sm text-[var(--foreground-muted)]">
          Accept to activate your account. You&apos;ll then sign in with your email and a one-time code (OTP).
        </p>

        {!token ? (
          <p className="mt-6 text-sm text-red-600 dark:text-red-400">Missing invitation link. Ask your consultant to resend.</p>
        ) : null}

        {token && status === "idle" ? (
          <button
            type="button"
            onClick={() => void accept()}
            className="mt-6 w-full rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-foreground)] shadow hover:opacity-90"
          >
            Accept invitation
          </button>
        ) : null}

        {status === "loading" ? (
          <p className="mt-6 text-sm text-[var(--foreground-muted)]">Confirming…</p>
        ) : null}

        {status === "ok" ? (
          <div className="mt-6 space-y-3 text-sm">
            <p className="text-[var(--foreground)]">
              You&apos;re in{message ? ` (${message})` : ""}. Continue to sign in with OTP.
            </p>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-4 py-3 font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
            >
              Go to login
            </Link>
          </div>
        ) : null}

        {status === "err" && message ? (
          <p className="mt-6 text-sm text-red-600 dark:text-red-400" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
