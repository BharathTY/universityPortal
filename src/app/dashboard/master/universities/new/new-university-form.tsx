"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

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
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [applicationFee, setApplicationFee] = React.useState("0");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/master/universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          applicationFee: Number(applicationFee),
          logoUrl: logoUrl.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
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
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-5">
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          Unique; used for the university admin account. Sign-in uses OTP; a generated password is emailed for your
          records.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Phone number</label>
        <input
          type="tel"
          inputMode="numeric"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Application fee</label>
        <input
          type="number"
          required
          min={0}
          step="0.01"
          value={applicationFee}
          onChange={(e) => setApplicationFee(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          Default application amount for this university (major currency units).
        </p>
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
            }}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
          />
        )}
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
