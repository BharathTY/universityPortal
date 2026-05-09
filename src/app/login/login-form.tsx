"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const REMEMBER_KEY = "qsp_auth_remember";
const EMAIL_KEY = "qsp_auth_email";

/** Seed accounts from `prisma/seed.ts` — database must be seeded. */
const DEMO_ACCOUNTS = [
  { label: "Master admin", email: "master@university.local" },
  { label: "Admin", email: "admin@university.local" },
  { label: "University staff", email: "university@university.local" },
  { label: "Consultant", email: "consultant@university.local" },
  { label: "Counsellor", email: "counsellor@university.local" },
  { label: "Qspiders branch", email: "branch@university.local" },
  { label: "Student (demo)", email: "student@university.local" },
] as const;

const showDemoLogins =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === "true";

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

type Props = {
  /** When true, use 6-digit email codes (request-otp / verify). When false, email-only session (`/api/auth/login`). */
  requireOtpLogin: boolean;
};

export function LoginForm({ requireOtpLogin }: Props) {
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

  function persistRememberChoice(normalized: string) {
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
  }

  async function signInEmailOnly(emailNorm: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailNorm }),
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    if (!res.ok) {
      const msg = data.error || "Something went wrong";
      setError(data.detail ? `${msg}: ${data.detail}` : msg);
      return;
    }
    persistRememberChoice(emailNorm);
    router.push("/dashboard");
    router.refresh();
  }

  async function signInWithOtp(emailNorm: string) {
    const res = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailNorm }),
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; otp?: string };
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    persistRememberChoice(emailNorm);

    if (data.otp && /^\d{6}$/.test(data.otp)) {
      try {
        sessionStorage.setItem(`otpPreview:${emailNorm}`, data.otp);
      } catch {
        /* ignore */
      }
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNorm, code: data.otp }),
        credentials: "include",
      });
      const verifyData = (await verifyRes.json().catch(() => ({}))) as { error?: string };
      if (!verifyRes.ok) {
        setError(verifyData.error || "Sign-in failed");
        return;
      }
      try {
        sessionStorage.removeItem(`otpPreview:${emailNorm}`);
      } catch {
        /* ignore */
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    if (data.otp && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`otpPreview:${emailNorm}`, data.otp);
      } catch {
        /* ignore */
      }
    }
    router.push(`/login/verify?email=${encodeURIComponent(emailNorm)}`);
  }

  async function quickSignIn(targetEmail: string) {
    setError(null);
    setEmail(targetEmail);
    setLoading(true);
    const normalized = targetEmail.trim().toLowerCase();
    try {
      if (requireOtpLogin) {
        await signInWithOtp(normalized);
      } else {
        await signInEmailOnly(normalized);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await quickSignIn(email);
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

      {showDemoLogins ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo logins</p>
          <p className="mt-1 text-xs text-slate-500">
            Click an account to sign in.{" "}
            {requireOtpLogin
              ? "In development the one-time code may be returned by the API. Run the seed first."
              : "Email-only sign-in is enabled (no verification code)."}
          </p>
          <ul className="mt-3 max-h-52 space-y-1.5 overflow-y-auto pr-0.5 sm:max-h-none">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void quickSignIn(a.email)}
                  className="flex w-full flex-col items-stretch gap-0.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition hover:border-[#1e6fe6] hover:bg-blue-50/60 disabled:opacity-50 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <span className="font-medium text-slate-800">{a.label}</span>
                  <span className="break-all font-mono text-xs text-slate-600">{a.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e6fe6] px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1a62cc] disabled:opacity-60"
      >
        {loading ? (
          "Signing in…"
        ) : (
          <>
            {requireOtpLogin ? "Continue" : "Sign in"}
            <ArrowRightIcon className="h-5 w-5" />
          </>
        )}
      </button>

      {error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {!requireOtpLogin ? (
        <p className="text-center text-xs text-slate-500">
          Anyone who knows a valid work email can access an account. Set{" "}
          <code className="rounded bg-slate-100 px-1">REQUIRE_OTP_LOGIN=true</code> in{" "}
          <code className="rounded bg-slate-100 px-1">.env</code> to require email verification codes.
        </p>
      ) : null}
    </form>
  );
}
