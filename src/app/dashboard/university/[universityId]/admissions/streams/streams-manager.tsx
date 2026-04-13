"use client";

import * as React from "react";

export type StreamRow = { id: string; name: string; sortOrder: number };

type Props = {
  universityId: string;
  initialStreams: StreamRow[];
};

export function StreamsManager({ universityId, initialStreams }: Props) {
  const [streams, setStreams] = React.useState(initialStreams);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/university/${universityId}/streams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { stream?: StreamRow; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not add stream");
        return;
      }
      if (data.stream) {
        setStreams((prev) => [...prev, data.stream!].sort((a, b) => a.sortOrder - b.sortOrder));
        setName("");
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Streams</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        Programs such as B.Tech, BCA, MCA — used as filters when viewing admissions.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="stream-name" className="block text-sm font-medium text-[var(--foreground)]">
            Add stream
          </label>
          <input
            id="stream-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. B.Tech"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            required
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add stream"}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <ul className="mt-10 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        {streams.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">No streams yet.</li>
        ) : (
          streams.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium text-[var(--foreground)]">{s.name}</span>
              <span className="text-[var(--foreground-muted)]">Order {s.sortOrder}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
