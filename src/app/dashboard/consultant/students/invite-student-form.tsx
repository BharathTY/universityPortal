"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export function InviteStudentForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/counsellors/invite-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not send invitation");
        return;
      }
      setDone(true);
      setEmail("");
      setName("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--foreground)]">
        Invitation sent. The student must accept the email before they can use OTP login.
        <button
          type="button"
          className="ml-2 font-medium text-[var(--primary)] underline"
          onClick={() => setDone(false)}
        >
          Invite another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Invite student</h2>
        <span className="inline-flex w-fit items-center rounded-full bg-[var(--accent-blue)] px-3 py-1 text-xs font-semibold text-white">
          + Invite new user
        </span>
      </div>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        Sends an email with an accept link. After they accept, they can sign in with email + OTP (counsellors and
        consultants use the same flow).
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="invite-email" className="text-sm font-medium text-[var(--foreground)]">
            Student email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] outline-none ring-[var(--primary)] focus:ring-2"
            placeholder="student@school.edu"
          />
        </div>
        <div>
          <label htmlFor="invite-name" className="text-sm font-medium text-[var(--foreground)]">
            Name (optional)
          </label>
          <input
            id="invite-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] outline-none ring-[var(--primary)] focus:ring-2"
            placeholder="Full name"
          />
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[var(--accent-blue-hover)] disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send invitation email"}
      </button>
    </form>
  );
}
