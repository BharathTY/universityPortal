"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const normalized = email.trim().toLowerCase();
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  const floatingLabelClass = "auth-floating-label peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs";
  const inputClass = "auth-input peer";

  if (sent) {
    return (
      <div className="mt-10 space-y-6">
        <div
          className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4 text-sm text-[var(--foreground)]"
          role="status"
        >
          If an account with that email exists and has a password, we sent reset instructions. Check
          your inbox and spam folder.
        </div>
        <Link href="/login" className="auth-btn-primary block text-center">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-6">
      <div className="relative">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder=" "
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputClass} pr-11`}
          aria-invalid={Boolean(error)}
        />
        <label htmlFor="email" className={floatingLabelClass}>
          E-mail
        </label>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <MailIcon className="h-5 w-5" />
        </span>
      </div>

      <button type="submit" disabled={loading} className="auth-btn-primary disabled:opacity-60">
        {loading ? "Sending…" : "Send reset link"}
      </button>

      {error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-center text-sm">
        <Link href="/login" className="auth-link">
          ← Back to sign in
        </Link>
      </p>
    </form>
  );
}
