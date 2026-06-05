import { HOSTEL_FEE_COMBOS, type HostelFeeAmounts } from "@/lib/hostel-fee-matrix";

function formatInr(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type StreamRow = { id: string; name: string; degreeType: string | null; streamFee: number | null };

export function UniversityOrganisationDetailsReadOnly({
  universityName,
  universityCode,
  location,
  streams,
  hostel,
}: {
  universityName: string;
  universityCode: string;
  location: string | null;
  streams: StreamRow[];
  hostel: HostelFeeAmounts;
}) {
  const loc = (location ?? "").trim();
  const hostelRows = HOSTEL_FEE_COMBOS.filter((c) => hostel[c.key] != null && hostel[c.key]! > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-sm font-medium text-[var(--foreground)]">University</h2>
        <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{universityName}</p>
        <p className="text-sm text-[var(--foreground-muted)]">Code: {universityCode}</p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-[var(--foreground)]">Location</h2>
        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-2 text-sm text-[var(--foreground)]">
          {loc.length > 0 ? loc : "—"}
        </p>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Degree type, stream & stream fee</h2>
        {streams.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">No programs listed yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {streams.map((s) => (
              <li
                key={s.id}
                className="grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 sm:grid-cols-3"
              >
                <div>
                  <p className="text-xs font-medium text-[var(--foreground-muted)]">Degree type</p>
                  <p className="text-sm text-[var(--foreground)]">{(s.degreeType ?? "").trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--foreground-muted)]">Stream</p>
                  <p className="text-sm font-medium text-[var(--foreground)]">{s.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--foreground-muted)]">Stream fee</p>
                  <p className="text-sm tabular-nums text-[var(--foreground)]">{formatInr(s.streamFee)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Hostel fee (annual)</h2>
        {hostelRows.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">No hostel fees configured.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {hostelRows.map((combo) => (
              <li key={combo.key} className="flex justify-between gap-4 border-b border-[var(--border)] py-2 last:border-0">
                <span className="text-[var(--foreground-muted)]">
                  {combo.genderLabel} · {combo.roomLabel} · {combo.sharingLabel}
                </span>
                <span className="tabular-nums font-medium text-[var(--foreground)]">{formatInr(hostel[combo.key])}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
