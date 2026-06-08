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

type Props = {
  universityId: string;
  initial: {
    name: string;
    email: string;
    phone: string;
    status: "ACTIVE" | "INACTIVE";
    logoUrl: string;
    applicationFee: string;
    paymentUpiId: string;
  };
};

export function EditUniversityForm({ universityId, initial }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState(initial.name);
  const [email, setEmail] = React.useState(initial.email);
  const [phone, setPhone] = React.useState(initial.phone);
  const [status, setStatus] = React.useState<"ACTIVE" | "INACTIVE">(initial.status);
  const [logoUrl, setLogoUrl] = React.useState(initial.logoUrl);
  const [applicationFee, setApplicationFee] = React.useState(initial.applicationFee);
  const [paymentUpiId, setPaymentUpiId] = React.useState(initial.paymentUpiId);

  const previewSrc = logoUrl.trim() || null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload: Record<string, string | number> = { name: name.trim() };
      const emailTrim = email.trim();
      if (emailTrim) payload.email = emailTrim;
      const phoneTrim = phone.trim();
      if (phoneTrim) payload.phone = phoneTrim;
      if (status !== initial.status) payload.status = status;
      if (logoUrl !== initial.logoUrl) payload.logoUrl = logoUrl.trim();
      const feeTrim = applicationFee.trim();
      if (feeTrim) payload.applicationFee = Number(feeTrim);
      payload.paymentUpiId = paymentUpiId.trim();

      const res = await fetch(`/api/master/universities/${universityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save");
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
        <label className="block text-sm font-medium text-[var(--foreground)]">
          Email <span className="font-normal text-[var(--foreground-muted)]">(optional)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Leave blank to keep current"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">
          Phone number <span className="font-normal text-[var(--foreground-muted)]">(optional)</span>
        </label>
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Leave blank to keep current"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">
          Application fee <span className="font-normal text-[var(--foreground-muted)]">(optional)</span>
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={applicationFee}
          onChange={(e) => setApplicationFee(e.target.value)}
          placeholder="Leave blank to keep current"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">
          Payment UPI ID
        </label>
        <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
          University account students pay when scanning the QR in Collect Payment (e.g. university@upi).
        </p>
        <input
          type="text"
          value={paymentUpiId}
          onChange={(e) => setPaymentUpiId(e.target.value)}
          placeholder="university@upi"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">
          Logo <span className="font-normal text-[var(--foreground-muted)]">(optional)</span>
        </label>
        <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
          Upload or change only if needed; leave unchanged to keep the current logo.
        </p>
        {previewSrc ? (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- stored logo URL */}
            <img src={previewSrc} alt="University logo" className="h-20 w-20 rounded-lg border border-[var(--border)] object-contain bg-[var(--muted)]/30" />
          </div>
        ) : (
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">No logo yet.</p>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          onChange={(e) => void onLogoFile(e)}
          className="mt-3 block w-full text-sm text-[var(--foreground-muted)] file:mr-3 file:rounded-lg file:border file:border-[var(--border)] file:bg-[var(--muted)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--foreground)]"
        />
        <p className="mt-2 text-xs text-[var(--foreground-muted)]">Or set a public image URL:</p>
        {logoUrl.startsWith("/uploads/") ? (
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Current logo is an uploaded file. Upload a new file above to replace it, or switch to a URL below.
          </p>
        ) : null}
        <input
          type="url"
          value={logoUrl.startsWith("/uploads/") ? "" : logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder={logoUrl.startsWith("/uploads/") ? "https://… (replaces uploaded logo)" : "https://…"}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
        {logoUrl.startsWith("/uploads/") ? (
          <button
            type="button"
            className="mt-2 text-sm text-red-600 underline"
            onClick={() => setLogoUrl("")}
          >
            Clear logo
          </button>
        ) : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">
          Status <span className="font-normal text-[var(--foreground-muted)]">(optional)</span>
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          Status is only updated when you change this dropdown from its current value.
        </p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
