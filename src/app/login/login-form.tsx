"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
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

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l22 22" />
    </svg>
  );
}

type Props = {
  /** When true, use 6-digit email codes (request-otp / verify). When false, email (+ password when set on account). */
  requireOtpLogin: boolean;
  /** Optional email from ?email= query (demo / bookmark links). */
  initialEmail?: string;
};

export function LoginForm({ requireOtpLogin, initialEmail = "" }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      } else if (initialEmail) {
        setEmail(initialEmail);
      }
    } catch {
      /* ignore */
    }
  }, [initialEmail]);

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

  async function signInEmailPassword(emailNorm: string, passwordValue: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailNorm,
        ...(passwordValue.trim().length > 0 ? { password: passwordValue } : {}),
      }),
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string; redirectTo?: string };
    if (!res.ok) {
      const msg = data.error || "Something went wrong";
      setError(data.detail ? `${msg}: ${data.detail}` : msg);
      return;
    }
    persistRememberChoice(emailNorm);
    router.push(data.redirectTo ?? "/dashboard");
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const normalized = email.trim().toLowerCase();
    try {
      if (requireOtpLogin) {
        await signInWithOtp(normalized);
      } else {
        await signInEmailPassword(normalized, password);
      }
    } finally {
      setLoading(false);
    }
  }

  const floatingLabelClass = "auth-floating-label peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs";
  const inputClass = "auth-input peer";

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

      {!requireOtpLogin ? (
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder=" "
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pr-11`}
          />
          <label htmlFor="password" className={floatingLabelClass}>
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="auth-checkbox h-4 w-4 rounded focus:ring-[var(--primary)]"
          />
          Remember me
        </label>
        <Link href="/forgot-password" className="auth-link">
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="auth-btn-primary disabled:opacity-60"
      >
        {loading ? "Signing in…" : requireOtpLogin ? "Continue" : "Sign in"}
      </button>

      {error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {requireOtpLogin ? (
        <p className="text-center text-xs text-slate-500">
          We’ll email you a one-time code to complete sign-in.
        </p>
      ) : (
        <p className="text-center text-xs text-slate-500">
          Accounts created with a password must enter it. Others can sign in with email only.
        </p>
      )}
    </form>
  );
}
