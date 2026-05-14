"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

export type StreamRowInitial = {
  id: string;
  name: string;
  degreeType: string;
  streamFee: number | null;
};

export type HostelFeesInitial = {
  girlsAc: number | null;
  girlsNonAc: number | null;
  boysAc: number | null;
  boysNonAc: number | null;
};

type Props = {
  universityId: string;
  universityName: string;
  initialLocation: string;
  initialStreams: StreamRowInitial[];
  initialHostel: HostelFeesInitial;
};

type StreamRowState = {
  id?: string;
  name: string;
  degreeType: string;
  streamFee: string;
};

function feeToInput(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function parseOptionalFee(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function UniversityDetailsForm({
  universityId,
  universityName,
  initialLocation,
  initialStreams,
  initialHostel,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [location, setLocation] = React.useState(initialLocation);
  const [streams, setStreams] = React.useState<StreamRowState[]>(() =>
    initialStreams.length > 0
      ? initialStreams.map((s) => ({
          id: s.id,
          name: s.name,
          degreeType: s.degreeType ?? "",
          streamFee: feeToInput(s.streamFee),
        }))
      : [{ name: "", degreeType: "", streamFee: "" }],
  );

  const [girlsAc, setGirlsAc] = React.useState(feeToInput(initialHostel.girlsAc));
  const [girlsNonAc, setGirlsNonAc] = React.useState(feeToInput(initialHostel.girlsNonAc));
  const [boysAc, setBoysAc] = React.useState(feeToInput(initialHostel.boysAc));
  const [boysNonAc, setBoysNonAc] = React.useState(feeToInput(initialHostel.boysNonAc));

  function addStreamRow() {
    setStreams((rows) => [...rows, { name: "", degreeType: "", streamFee: "" }]);
  }

  function removeStreamRow(index: number) {
    setStreams((rows) => {
      const row = rows[index];
      if (row?.id) return rows;
      const next = rows.filter((_, i) => i !== index);
      return next.length === 0 ? [{ name: "", degreeType: "", streamFee: "" }] : next;
    });
  }

  function updateStreamRow(index: number, patch: Partial<StreamRowState>) {
    setStreams((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const streamPayload = streams
      .map((s) => ({
        id: s.id,
        name: s.name.trim(),
        degreeType: s.degreeType.trim() || null,
        streamFee: parseOptionalFee(s.streamFee),
      }))
      .filter((s) => s.name.length > 0);

    for (const s of streams) {
      if (s.name.trim() === "" && (s.degreeType.trim() !== "" || s.streamFee.trim() !== "")) {
        setError("Each program row needs a stream name if degree type or stream fee is set.");
        return;
      }
      const ft = s.streamFee.trim();
      if (ft !== "" && (!Number.isFinite(Number(ft)) || Number(ft) < 0)) {
        setError("Stream fees must be valid non-negative numbers.");
        return;
      }
    }

    const hostelFields: [string, string][] = [
      ["Girls AC hostel fee", girlsAc],
      ["Girls non-AC hostel fee", girlsNonAc],
      ["Boys AC hostel fee", boysAc],
      ["Boys non-AC hostel fee", boysNonAc],
    ];
    for (const [label, raw] of hostelFields) {
      const t = raw.trim();
      if (t !== "" && (!Number.isFinite(Number(t)) || Number(t) < 0)) {
        setError(`${label} must be a valid non-negative number.`);
        return;
      }
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/master/universities/${universityId}/details`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: location.trim(),
          streams: streamPayload.map((s) => ({
            ...(s.id ? { id: s.id } : {}),
            name: s.name,
            degreeType: s.degreeType,
            streamFee: s.streamFee,
          })),
          hostelFees: {
            girlsAc: parseOptionalFee(girlsAc),
            girlsNonAc: parseOptionalFee(girlsNonAc),
            boysAc: parseOptionalFee(boysAc),
            boysNonAc: parseOptionalFee(boysNonAc),
          },
        }),
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

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-8">
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">University name</label>
        <input
          readOnly
          value={universityName}
          className="mt-1 w-full cursor-not-allowed rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-[var(--foreground)]"
        />
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">Read-only. Edit the display name from Edit university if needed.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Location</label>
        <textarea
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          rows={3}
          placeholder="City, state, campus address, or region"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
          disabled={busy}
        />
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Degree type, stream & stream fee</h2>
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">
              One row per program. Stream matches admissions setup; add degree type and tuition/stream fee here.
            </p>
          </div>
          <button
            type="button"
            onClick={addStreamRow}
            disabled={busy}
            className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/50 disabled:opacity-50"
          >
            Add row
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {streams.map((row, index) => (
            <div
              key={row.id ?? `new-${index}`}
              className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 sm:grid-cols-12"
            >
              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-[var(--foreground-muted)]">Degree type</label>
                <input
                  value={row.degreeType}
                  onChange={(e) => updateStreamRow(index, { degreeType: e.target.value })}
                  placeholder="e.g. Undergraduate"
                  disabled={busy}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="text-xs font-medium text-[var(--foreground-muted)]">Stream</label>
                <input
                  value={row.name}
                  onChange={(e) => updateStreamRow(index, { name: e.target.value })}
                  placeholder="e.g. B.Tech CSE"
                  disabled={busy}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-[var(--foreground-muted)]">Stream fee</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.streamFee}
                  onChange={(e) => updateStreamRow(index, { streamFee: e.target.value })}
                  placeholder="Amount"
                  disabled={busy}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm tabular-nums text-[var(--foreground)]"
                />
              </div>
              <div className="flex items-end sm:col-span-2">
                {!row.id ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeStreamRow(index)}
                    className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : (
                  <span className="text-xs text-[var(--foreground-muted)]">Saved</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Hostel fee</h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Annual hostel fee (major currency units). Separate values for girls and boys, and for AC vs non-AC rooms.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Girls</h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs text-[var(--foreground-muted)]">AC room</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={girlsAc}
                  onChange={(e) => setGirlsAc(e.target.value)}
                  disabled={busy}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--foreground-muted)]">Non-AC room</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={girlsNonAc}
                  onChange={(e) => setGirlsNonAc(e.target.value)}
                  disabled={busy}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Boys</h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs text-[var(--foreground-muted)]">AC room</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={boysAc}
                  onChange={(e) => setBoysAc(e.target.value)}
                  disabled={busy}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--foreground-muted)]">Non-AC room</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={boysNonAc}
                  onChange={(e) => setBoysNonAc(e.target.value)}
                  disabled={busy}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save details"}
        </button>
        <Link
          href="/dashboard/master/universities"
          className="inline-flex items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
