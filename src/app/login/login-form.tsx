"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const REMEMBER_KEY = "qsp_auth_remember";
const EMAIL_KEY = "qsp_auth_email";

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

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem(REMEMBER_KEY) === "1";
      const saved = localStorage.getItem(EMAIL_KEY);
      if (r && saved) {
        setRemember(true);
        setEmail(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const normalized = email.trim().toLowerCase();
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; otp?: string };
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      try {
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, "1");
          localStorage.setItem(EMAIL_KEY, normalized);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
          localStorage.removeItem(EMAIL_KEY);
        }
      } catch {
        /* ignore */
      }
      if (data.otp && typeof window !== "undefined") {
        try {
          sessionStorage.setItem(`otpPreview:${normalized}`, data.otp);
        } catch {
          /* ignore */
        }
      }
      router.push(`/login/verify?email=${encodeURIComponent(normalized)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-600">
          Email
        </label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <MailIcon className="h-5 w-5" />
          </span>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-slate-900 shadow-sm outline-none ring-[#1e6fe6] placeholder:text-slate-400 focus:border-[#1e6fe6] focus:ring-2"
            placeholder="Enter your email"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#1e6fe6] focus:ring-[#1e6fe6]"
          />
          Remember me
        </label>
        <a
          href="mailto:support@university.edu?subject=Login%20help"
          className="text-sm font-medium text-[#1e6fe6] hover:underline"
        >
          Can&apos;t access email?
        </a>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e6fe6] px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1a62cc] disabled:opacity-60"
      >
        {loading ? (
          "Sending code…"
        ) : (
          <>
            Continue
            <ArrowRightIcon className="h-5 w-5" />
          </>
        )}
      </button>

      {error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
