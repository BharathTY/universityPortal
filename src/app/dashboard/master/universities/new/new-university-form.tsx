"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

function mapApiFieldErrors(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0]!;
    else if (typeof v === "string") out[k] = v;
  }
  return out;
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function validateUniversityClient(input: {
  name: string;
  email: string;
  phone: string;
  applicationFee: string;
  logoUrl: string;
}): Record<string, string> {
  const e: Record<string, string> = {};
  const n = input.name.trim();
  if (n.length < 2) e.name = "Name must be at least 2 characters";
  if (/^\d+$/.test(n)) e.name = "Name cannot be numbers only";
  const em = input.email.trim();
  if (!em) e.email = "Email is required";
  else if (!looksLikeEmail(em)) e.email = "Enter a valid email address";
  const p = input.phone.trim();
  if (!/^[\d+][\d\s().-/]{5,30}$/.test(p)) e.phone = "Enter a valid phone number (digits, spaces, or + prefix)";
  const fee = Number(input.applicationFee);
  if (Number.isNaN(fee) || fee < 0) e.applicationFee = "Enter a valid fee (0 or more)";
  const logo = input.logoUrl.trim();
  if (logo && !/^https?:\/\//i.test(logo) && !logo.startsWith("/uploads/")) {
    e.logoUrl = "Logo must be an https URL or an uploaded file";
  }
  return e;
}

async function uploadLogoFile(file: File): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  const res = await fetch("/api/master/universities/logo", {
    method: "POST",
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  if (!data.url) throw new Error("No URL returned");
  return data.url;
}

export function NewUniversityForm() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [applicationFee, setApplicationFee] = React.useState("0");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function borderFor(key: string) {
    return fieldErrors[key] ? "border-red-500" : "border-[var(--border)]";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clientErr = validateUniversityClient({
      name,
      email,
      phone,
      applicationFee,
      logoUrl,
    });
    if (Object.keys(clientErr).length > 0) {
      setFieldErrors(clientErr);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/master/universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          applicationFee: Number(applicationFee),
          logoUrl: logoUrl.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: unknown;
      };
      if (!res.ok) {
        const apiFe = mapApiFieldErrors(data.fieldErrors);
        if (Object.keys(apiFe).length > 0) setFieldErrors(apiFe);
        setError(data.error ?? "Could not create university");
        return;
      }
      router.push("/dashboard/master/universities");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const url = await uploadLogoFile(file);
      setLogoUrl(url);
      setLogoPreview(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload logo");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-5" noValidate>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Name</label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.name;
              return n;
            });
          }}
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("name")}`}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Email</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.email;
              return n;
            });
          }}
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("email")}`}
          aria-invalid={Boolean(fieldErrors.email)}
        />
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          Unique; used for the university admin account. Sign-in uses OTP; a generated password is emailed for your
          records.
        </p>
        {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Phone number</label>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.phone;
              return n;
            });
          }}
          placeholder="+91 98765 43210"
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("phone")}`}
          aria-invalid={Boolean(fieldErrors.phone)}
        />
        {fieldErrors.phone ? <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p> : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Application fee</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={applicationFee}
          onChange={(e) => {
            setApplicationFee(e.target.value);
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.applicationFee;
              return n;
            });
          }}
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("applicationFee")}`}
          aria-invalid={Boolean(fieldErrors.applicationFee)}
        />
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          Default application amount for this university (major currency units).
        </p>
        {fieldErrors.applicationFee ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.applicationFee}</p>
        ) : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Logo (optional)</label>
        <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">PNG, JPG, WebP, GIF, or SVG — max 2 MB.</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          onChange={(e) => void onLogoFile(e)}
          className="mt-2 block w-full text-sm text-[var(--foreground-muted)] file:mr-3 file:rounded-lg file:border file:border-[var(--border)] file:bg-[var(--muted)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--foreground)]"
        />
        {logoPreview ? (
          <div className="mt-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- user or uploaded URL */}
            <img src={logoPreview} alt="" className="h-14 w-14 rounded-lg border border-[var(--border)] object-contain" />
            <button
              type="button"
              onClick={() => {
                setLogoUrl("");
                setLogoPreview(null);
              }}
              className="text-sm text-red-600 underline"
            >
              Remove logo
            </button>
          </div>
        ) : null}
        <p className="mt-2 text-xs text-[var(--foreground-muted)]">Or enter a public image URL:</p>
        {logoUrl.startsWith("/uploads/") ? (
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">Using uploaded file (shown above).</p>
        ) : (
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => {
              const v = e.target.value;
              setLogoUrl(v);
              setLogoPreview(v.trim() || null);
              setFieldErrors((f) => {
                const n = { ...f };
                delete n.logoUrl;
                return n;
              });
            }}
            placeholder="https://…"
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("logoUrl")}`}
            aria-invalid={Boolean(fieldErrors.logoUrl)}
          />
        )}
        {fieldErrors.logoUrl ? <p className="mt-1 text-xs text-red-600">{fieldErrors.logoUrl}</p> : null}
      </div>
      <p className="text-sm text-[var(--foreground-muted)]">
        A secure password is generated automatically and emailed to the address above when you submit.
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
