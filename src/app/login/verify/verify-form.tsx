"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

const CELL_COUNT = 6;

export function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [digits, setDigits] = useState<string[]>(() => Array(CELL_COUNT).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const autoFocusDone = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Shown when OTP is returned by the API (dev / SHOW_OTP_ON_SCREEN). */
  const [screenOtp, setScreenOtp] = useState<string | null>(null);

  useEffect(() => {
    if (!email || typeof window === "undefined") return;
    try {
      const key = `otpPreview:${email.toLowerCase()}`;
      const stored = sessionStorage.getItem(key);
      if (stored && /^\d{6}$/.test(stored)) {
        setScreenOtp(stored);
      }
    } catch {
      /* ignore */
    }
  }, [email]);

  const focusIndex = useCallback((i: number) => {
    requestAnimationFrame(() => {
      inputsRef.current[i]?.focus();
      inputsRef.current[i]?.select();
    });
  }, []);

  useEffect(() => {
    if (!email || autoFocusDone.current) return;
    autoFocusDone.current = true;
    focusIndex(0);
  }, [email, focusIndex]);

  const setDigit = useCallback(
    (i: number, raw: string) => {
      const cleaned = raw.replace(/\D/g, "");

      if (cleaned.length > 1) {
        setDigits((prev) => {
          const next = [...prev];
          const chars = cleaned.slice(0, CELL_COUNT).split("");
          chars.forEach((c, j) => {
            const t = i + j;
            if (t < CELL_COUNT) next[t] = c;
          });
          return next;
        });
        focusIndex(Math.min(i + cleaned.length - 1, CELL_COUNT - 1));
        return;
      }

      const d = cleaned.slice(-1);
      setDigits((prev) => {
        const next = [...prev];
        next[i] = d;
        return next;
      });
      if (d && i < CELL_COUNT - 1) {
        focusIndex(i + 1);
      }
    },
    [focusIndex],
  );

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && e.currentTarget.value === "" && i > 0) {
      e.preventDefault();
      focusIndex(i - 1);
    }
  }

  function onPaste(e: ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CELL_COUNT);
    if (!text) return;
    const chars = text.split("");
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < chars.length; i++) {
        next[i] = chars[i]!;
      }
      return next;
    });
    const last = Math.min(text.length, CELL_COUNT) - 1;
    focusIndex(Math.max(0, last));
  }

  const code = digits.join("");

  async function submit() {
    if (!email) {
      setError("Missing email. Go back and enter your work email.");
      return;
    }
    if (code.length !== CELL_COUNT) {
      setError("Enter all 6 digits.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }
      try {
        sessionStorage.removeItem(`otpPreview:${email.toLowerCase()}`);
      } catch {
        /* ignore */
      }
      setScreenOtp(null);
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; otp?: string };
      if (!res.ok) {
        setError(data.error || "Could not resend");
        return;
      }
      if (data.otp && /^\d{6}$/.test(data.otp)) {
        setScreenOtp(data.otp);
        try {
          sessionStorage.setItem(`otpPreview:${email.toLowerCase()}`, data.otp);
        } catch {
          /* ignore */
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {screenOtp ? (
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Your sign-in code
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.35em] text-slate-900">
            {screenOtp}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Same code was sent to your email when configured. Use the digits above if you do not
            receive the message.
          </p>
        </div>
      ) : null}
      <div className="flex justify-center gap-2" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            name={`otp-${i + 1}`}
            maxLength={i === 0 ? 6 : 1}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            className="h-12 w-10 rounded-xl border border-slate-200 bg-white text-center text-lg font-semibold text-slate-900 shadow-sm outline-none ring-[#1e6fe6] focus:border-[#1e6fe6] focus:ring-2"
            aria-label={`Digit ${i + 1} of ${CELL_COUNT}`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e6fe6] px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1a62cc] disabled:opacity-60"
      >
        {loading ? (
          "Signing in…"
        ) : (
          <>
            Sign in
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </button>
      <p className="text-center text-sm">
        <button
          type="button"
          onClick={resend}
          className="font-medium text-[#1e6fe6] hover:underline disabled:opacity-50"
          disabled={loading || !email}
        >
          Resend code
        </button>
      </p>
      {error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
