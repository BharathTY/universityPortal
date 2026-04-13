"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

export function NewUniversityForm() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

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
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
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
