"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  HOSTEL_FEE_COMBOS,
  hostelFeeAmountsFromForm,
  hostelFeesFormFromAmounts,
  type HostelFeeAmounts,
  type HostelFeeKey,
  type HostelFeesForm,
} from "@/lib/hostel-fee-matrix";

export type StreamRowInitial = {
  id: string;
  name: string;
  degreeType: string;
  streamFee: number | null;
};

/** @deprecated use HostelFeeAmounts from @/lib/hostel-fee-matrix */
export type HostelFeesInitial = HostelFeeAmounts;

type Props = {
  universityId: string;
  universityName: string;
  initialLocation: string;
  initialStreams: StreamRowInitial[];
  initialHostel: HostelFeeAmounts;
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

  const [hostelFees, setHostelFees] = React.useState<HostelFeesForm>(() =>
    hostelFeesFormFromAmounts(initialHostel),
  );

  function setHostelField(key: HostelFeeKey, value: string) {
    setHostelFees((prev) => ({ ...prev, [key]: value }));
  }

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

    for (const combo of HOSTEL_FEE_COMBOS) {
      const raw = hostelFees[combo.key].trim();
      if (raw !== "" && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) {
        setError(`${combo.genderLabel} · ${combo.roomLabel} · ${combo.sharingLabel} must be a valid fee.`);
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
          hostelFees: hostelFeeAmountsFromForm(hostelFees),
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
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Location</label>
        <textarea
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
          disabled={busy}
        />
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Degree type, stream &amp; stream fee</h2>
          <button type="button" onClick={addStreamRow} disabled={busy} className="text-sm font-medium text-[var(--primary)]">
            + Add row
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {streams.map((row, index) => (
            <div key={row.id ?? `new-${index}`} className="grid gap-3 rounded-lg border border-[var(--border)] p-4 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <label className="text-xs text-[var(--foreground-muted)]">Degree type</label>
                <input value={row.degreeType} onChange={(e) => updateStreamRow(index, { degreeType: e.target.value })} disabled={busy} className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" />
              </div>
              <div className="sm:col-span-4">
                <label className="text-xs text-[var(--foreground-muted)]">Stream</label>
                <input value={row.name} onChange={(e) => updateStreamRow(index, { name: e.target.value })} disabled={busy} className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label className="text-xs text-[var(--foreground-muted)]">Stream fee</label>
                <input value={row.streamFee} onChange={(e) => updateStreamRow(index, { streamFee: e.target.value })} disabled={busy} className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm tabular-nums" />
              </div>
              <div className="flex items-end sm:col-span-2">
                {!row.id ? (
                  <button type="button" disabled={busy} onClick={() => removeStreamRow(index)} className="text-sm text-red-600 hover:underline">
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
        <h2 className="text-lg font-semibold">Hostel fee matrix</h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Annual fees for all 16 combinations (boys/girls × AC/non-AC × sharing type). Leave blank to clear.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HOSTEL_FEE_COMBOS.map((combo) => (
            <div key={combo.key}>
              <label className="text-xs text-[var(--foreground-muted)]">
                {combo.genderLabel} · {combo.roomLabel} · {combo.sharingLabel}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={hostelFees[combo.key]}
                onChange={(e) => setHostelField(combo.key, e.target.value.replace(/[^\d.]/g, ""))}
                disabled={busy}
                className="mt-0.5 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm tabular-nums"
              />
            </div>
          ))}
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Save details"}
        </button>
        <Link href="/dashboard/master/universities" className="inline-flex items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium">
          Cancel
        </Link>
      </div>
    </form>
  );
}
