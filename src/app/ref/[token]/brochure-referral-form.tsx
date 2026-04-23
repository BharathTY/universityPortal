"use client";

import * as React from "react";

type Props = {
  token: string;
  batchTitle: string;
  batchCode: string;
};

export function BrochureReferralForm({ token, batchTitle, batchCode }: Props) {
  const [fn, setFn] = React.useState("");
  const [ln, setLn] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [refFn, setRefFn] = React.useState("");
  const [refLn, setRefLn] = React.useState("");
  const [refPhone, setRefPhone] = React.useState("");
  const [refEmail, setRefEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/batch-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName: fn,
          lastName: ln,
          email,
          mobile,
          referralFirstName: refFn || null,
          referralLastName: refLn || null,
          referralPhone: refPhone || null,
          referralEmail: refEmail || null,
          website,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again later.");
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-[var(--foreground)]">Thank you</p>
        <p className="mt-2 text-sm text-[var(--foreground-muted)]">
          Your referral has been submitted. Our team will follow up with the prospective student.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Intake</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)]">{batchTitle}</h1>
        <p className="text-sm text-[var(--foreground-muted)]">{batchCode}</p>
        <p className="mt-3 text-sm text-[var(--foreground-muted)]">
          Refer a prospective student. Their details go to our admissions team. If you are a current student referring
          someone, add your details in the optional referrer section.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Prospective student</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-[var(--foreground-muted)]">First name *</span>
            <input
              required
              value={fn}
              onChange={(e) => setFn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              autoComplete="given-name"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--foreground-muted)]">Last name *</span>
            <input
              required
              value={ln}
              onChange={(e) => setLn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              autoComplete="family-name"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-[var(--foreground-muted)]">Email *</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-[var(--foreground-muted)]">Mobile *</span>
            <input
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              autoComplete="tel"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Referrer (optional)</h2>
        <p className="text-xs text-[var(--foreground-muted)]">If you are referring this person, leave your contact here.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-[var(--foreground-muted)]">Your first name</span>
            <input
              value={refFn}
              onChange={(e) => setRefFn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--foreground-muted)]">Your last name</span>
            <input
              value={refLn}
              onChange={(e) => setRefLn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--foreground-muted)]">Your phone</span>
            <input
              value={refPhone}
              onChange={(e) => setRefPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--foreground-muted)]">Your email</span>
            <input
              type="email"
              value={refEmail}
              onChange={(e) => setRefEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </label>
        </div>
      </section>

      <input
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-[var(--accent-blue)] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-blue-hover)] disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {busy ? "Submitting…" : "Submit referral"}
      </button>
    </form>
  );
}
