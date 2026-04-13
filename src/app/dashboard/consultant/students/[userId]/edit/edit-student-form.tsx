"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  initialName: string;
  email: string;
};

export function EditStudentForm({ userId, initialName, email }: Props) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      router.push(`/dashboard/consultant/students/${userId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
    >
      <div>
        <label htmlFor="edit-name" className="text-sm font-medium text-[var(--foreground)]">
          User display name
        </label>
        <input
          id="edit-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] outline-none ring-[var(--primary)] focus:ring-2"
          placeholder="Full name"
          autoComplete="name"
        />
      </div>
      <div className="mt-4">
        <span className="text-sm font-medium text-[var(--foreground)]">Contact email</span>
        <p className="mt-1 rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/30 px-3 py-2 text-sm text-[var(--foreground-muted)]">
          {email}
        </p>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">Email can’t be changed here.</p>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link
          href={`/dashboard/consultant/students/${userId}`}
          className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]/50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[var(--accent-blue-hover)] disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
