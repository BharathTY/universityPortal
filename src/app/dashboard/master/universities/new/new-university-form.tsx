"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);
const LOGO_TYPE_ERR = "Only PNG, JPG, JPEG, SVG, or WEBP files are allowed";
const LOGO_SIZE_ERR = "File size should not exceed 2 MB";

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

function validateLogoFile(file: File): string | null {
  const mime = file.type || "";
  if (!LOGO_ALLOWED_MIME.has(mime)) return LOGO_TYPE_ERR;
  if (file.size > LOGO_MAX_BYTES) return LOGO_SIZE_ERR;
  return null;
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
  if (n.length === 0) e.name = "University name is required";

  const em = input.email.trim();
  if (em.length > 0 && !looksLikeEmail(em)) e.email = "Enter a valid email address";

  const p = input.phone.trim();
  if (p.length > 0) {
    if (!/^\d+$/.test(p)) e.phone = "Only numeric values are allowed";
    else if (p.length !== 10) e.phone = "Phone number must be 10 digits";
  }

  const feeRaw = input.applicationFee.trim();
  if (feeRaw.length > 0) {
    if (!/^\d+$/.test(feeRaw)) e.applicationFee = "Enter a valid application fee";
    else {
      const fee = Number(feeRaw);
      if (!Number.isInteger(fee) || fee <= 0) e.applicationFee = "Enter a valid application fee";
    }
  }

  const logo = input.logoUrl.trim();
  if (logo && !/^https:\/\//i.test(logo) && !logo.startsWith("/uploads/")) {
    e.logoUrl = "Enter a valid https image URL or use file upload";
  }

  return e;
}

function isClientFormValid(input: Parameters<typeof validateUniversityClient>[0], logoFileError: string | null): boolean {
  if (logoFileError) return false;
  return Object.keys(validateUniversityClient(input)).length === 0;
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
  const [logoFileError, setLogoFileError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [applicationFee, setApplicationFee] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const formInput = React.useMemo(
    () => ({ name, email, phone, applicationFee, logoUrl }),
    [name, email, phone, applicationFee, logoUrl],
  );

  const formValid = React.useMemo(
    () => isClientFormValid(formInput, logoFileError),
    [formInput, logoFileError],
  );

  function borderFor(key: string) {
    return fieldErrors[key] ? "border-red-500" : "border-[var(--border)]";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clientErr = validateUniversityClient(formInput);
    if (logoFileError) {
      setFieldErrors(clientErr);
      return;
    }
    if (Object.keys(clientErr).length > 0) {
      setFieldErrors(clientErr);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        logoUrl: logoUrl.trim() || null,
      };
      const em = email.trim();
      if (em) payload.email = em;
      const ph = phone.trim();
      if (ph) payload.phone = ph;
      const feeRaw = applicationFee.trim();
      if (feeRaw) payload.applicationFee = Number(feeRaw);

      const res = await fetch("/api/master/universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const locked = busy;

  function onLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (busy) return;
    setError(null);
    setLogoFileError(null);
    const err = validateLogoFile(file);
    if (err) {
      setLogoFileError(err);
      setFieldErrors((f) => {
        const n = { ...f };
        delete n.logoFile;
        return n;
      });
      return;
    }
    void (async () => {
      try {
        const url = await uploadLogoFile(file);
        setLogoUrl(url);
        setLogoPreview(url);
        setLogoFileError(null);
        setFieldErrors((f) => {
          const n = { ...f };
          delete n.logoUrl;
          delete n.logoFile;
          return n;
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not upload logo";
        setLogoFileError(msg);
      }
    })();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-5" noValidate>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">University name</label>
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
          autoComplete="organization"
          disabled={locked}
        />
        {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Email (optional)</label>
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
          disabled={locked}
        />
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          If provided, must be unique. We create a university-admin account and email a generated password. Sign-in uses
          OTP; the password is for your records.
        </p>
        {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Phone number (optional)</label>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          value={phone}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 10);
            setPhone(next);
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.phone;
              return n;
            });
          }}
          placeholder="10-digit mobile number"
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("phone")}`}
          aria-invalid={Boolean(fieldErrors.phone)}
          disabled={locked}
        />
        {fieldErrors.phone ? <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p> : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Application fee (optional)</label>
        <input
          type="text"
          inputMode="numeric"
          value={applicationFee}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            setApplicationFee(raw);
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.applicationFee;
              return n;
            });
          }}
          placeholder="e.g. 5000"
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("applicationFee")}`}
          aria-invalid={Boolean(fieldErrors.applicationFee)}
          disabled={locked}
        />
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          Whole number only (&gt; 0), no decimals. Leave blank if not set yet.
        </p>
        {fieldErrors.applicationFee ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.applicationFee}</p>
        ) : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Logo (optional)</label>
        <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
          PNG, JPG, JPEG, SVG, or WEBP — max 2 MB.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          onChange={onLogoPick}
          disabled={locked}
          className={`mt-2 block w-full text-sm text-[var(--foreground-muted)] file:mr-3 file:rounded-lg file:border file:border-[var(--border)] file:bg-[var(--muted)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--foreground)] ${logoFileError ? "rounded-lg ring-1 ring-red-500" : ""}`}
          aria-invalid={Boolean(logoFileError)}
        />
        {logoFileError ? <p className="mt-1 text-xs text-red-600">{logoFileError}</p> : null}
        {logoPreview ? (
          <div className="mt-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- user or uploaded URL */}
            <img src={logoPreview} alt="" className="h-14 w-14 rounded-lg border border-[var(--border)] object-contain" />
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                setLogoUrl("");
                setLogoPreview(null);
                setLogoFileError(null);
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
            disabled={locked}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("logoUrl")}`}
            aria-invalid={Boolean(fieldErrors.logoUrl)}
          />
        )}
        {fieldErrors.logoUrl ? <p className="mt-1 text-xs text-red-600">{fieldErrors.logoUrl}</p> : null}
      </div>
      <p className="text-sm text-[var(--foreground-muted)]">
        Only the university name is required. If you add an email, we email a generated password to that address when
        you submit.
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={busy || !formValid}
          className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
