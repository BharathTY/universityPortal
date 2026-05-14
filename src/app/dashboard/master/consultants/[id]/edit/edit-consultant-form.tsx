"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

type Uni = { id: string; name: string; code: string };

type Props = {
  userId: string;
  universities: Uni[];
  initial: {
    name: string;
    email: string;
    phone: string;
    universityIds: string[];
    accountStatus: "ACTIVE" | "INACTIVE";
  };
};

export function EditConsultantForm({ userId, universities, initial }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState(initial.name);
  const [email, setEmail] = React.useState(initial.email);
  const [phone, setPhone] = React.useState(initial.phone);
  const [selectedUniIds, setSelectedUniIds] = React.useState<Set<string>>(new Set(initial.universityIds));
  const [accountStatus, setAccountStatus] = React.useState<"ACTIVE" | "INACTIVE">(initial.accountStatus);

  function toggleUniversity(id: string) {
    setSelectedUniIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllUniversities() {
    setSelectedUniIds(new Set(universities.map((u) => u.id)));
  }

  function clearUniversities() {
    setSelectedUniIds(new Set());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/master/consultants/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          universityIds: [...selectedUniIds],
          accountStatus,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      router.push("/dashboard/master/consultants");
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
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Phone number</label>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
      </div>
      <div>
        <span className="block text-sm font-medium text-[var(--foreground)]">Assigned universities</span>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          Only active universities are listed. Select one, several, or all.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllUniversities}
            className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearUniversities}
            className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Clear
          </button>
        </div>
        <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          {universities.length === 0 ? (
            <li className="text-sm text-[var(--foreground-muted)]">No active universities available.</li>
          ) : (
            universities.map((u) => (
              <li key={u.id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={selectedUniIds.has(u.id)}
                    onChange={() => toggleUniversity(u.id)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border)]"
                  />
                  <span>
                    {u.name}{" "}
                    <span className="text-xs text-[var(--foreground-muted)]">({u.code})</span>
                  </span>
                </label>
              </li>
            ))
          )}
        </ul>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Status</label>
        <select
          value={accountStatus}
          onChange={(e) => setAccountStatus(e.target.value as "ACTIVE" | "INACTIVE")}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
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
