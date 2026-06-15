"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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

export function ActivateAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing activation link. Check your email for the QSpiders Eduversity invitation.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; email?: string };
      if (!res.ok) {
        setError(data.error || "Could not activate account");
        return;
      }
      router.push("/login?activated=1");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const floatingLabelClass =
    "auth-floating-label peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs";
  const inputClass = "auth-input peer";

  if (!token) {
    return (
      <div className="mt-10 space-y-6">
        <p className="text-sm text-red-600" role="alert">
          This activation link is invalid. Open the link from your QSpiders Eduversity welcome email.
        </p>
        <Link href="/login" className="auth-btn-primary block text-center">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-6">
      <div className="relative">
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
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

      <div className="relative">
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          placeholder=" "
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />
        <label htmlFor="confirmPassword" className={floatingLabelClass}>
          Confirm password
        </label>
      </div>

      <button type="submit" disabled={loading} className="auth-btn-primary disabled:opacity-60">
        {loading ? "Setting up…" : "Create password & activate"}
      </button>

      {error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-center text-sm">
        <Link href="/login" className="auth-link">
          Already activated? Sign in
        </Link>
      </p>
    </form>
  );
}
