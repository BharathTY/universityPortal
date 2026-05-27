"use client";

import * as React from "react";
import { UniversityOrganisationDetailsReadOnly } from "@/components/university-organisation-details-read-only";
import {
  formatInrCompact,
  type AssignedUniversityCard,
} from "@/lib/consultant-assigned-universities-data";

export type { AssignedUniversityCard };

function ProgramPreviewCell({
  program,
}: {
  program: AssignedUniversityCard["programsPreview"][number] | null;
}) {
  if (!program) {
    return (
      <div className="rounded-lg bg-[var(--muted)]/35 px-3 py-2.5 text-xs text-[var(--foreground-muted)]">
        —
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[var(--muted)]/35 px-3 py-2.5">
      <p className="text-sm font-semibold leading-snug text-[var(--foreground)]">{program.label}</p>
      <p className="mt-1 text-sm font-medium tabular-nums text-[var(--foreground)]">
        {formatInrCompact(program.fee)}
      </p>
      <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{program.seatsLeft} left</p>
    </div>
  );
}

export function ConsultantAssignedUniversitiesClient({
  universities,
}: {
  universities: AssignedUniversityCard[];
}) {
  const [selected, setSelected] = React.useState<AssignedUniversityCard | null>(null);

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        {universities.map((u) => {
          const previewSlots = [
            u.programsPreview[0] ?? null,
            u.programsPreview[1] ?? null,
            u.programsPreview[2] ?? null,
            u.programsPreview[3] ?? null,
          ];

          return (
            <article
              key={u.id}
              className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-[var(--primary)]/35"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-xl font-bold leading-tight text-[var(--foreground)]">{u.name}</h2>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">{u.locationLine}</p>
                  {u.status !== "ACTIVE" ? (
                    <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                      Inactive
                    </span>
                  ) : null}
                </div>
                {u.totalSeats > 0 ? (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold tabular-nums text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                    {u.totalSeats} seats
                  </span>
                ) : null}
              </div>

              {previewSlots.some(Boolean) ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {previewSlots.map((program, index) => (
                    <ProgramPreviewCell key={program?.id ?? `empty-${index}`} program={program} />
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--foreground-muted)]">
                  No programmes configured yet.
                </p>
              )}

              <div className="mt-4 flex items-end justify-between gap-3 border-t border-[var(--border)] pt-4">
                <p className="text-sm text-[var(--foreground-muted)]">
                  {u.hostelFromFee != null ? (
                    <>
                      Hostel from{" "}
                      <span className="font-semibold text-[var(--foreground)]">
                        {formatInrCompact(u.hostelFromFee)}/yr
                      </span>
                    </>
                  ) : (
                    "Hostel fees on request"
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setSelected(u)}
                  className="text-sm font-semibold text-[var(--primary)] hover:underline"
                >
                  View details &gt;
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {universities.length === 0 ? (
        <p className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">
          No universities assigned yet. Ask your master administrator to link organisations to your account.
        </p>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => setSelected(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="uni-detail-title"
            className="relative z-[101] max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="uni-detail-title" className="text-lg font-semibold text-[var(--foreground)]">
                  {selected.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--foreground-muted)]">{selected.locationLine}</p>
                {selected.totalSeats > 0 ? (
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                    {selected.seatsRemaining} of {selected.totalSeats} seats available
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-[var(--border)] px-3 py-1 text-sm text-[var(--foreground-muted)] hover:bg-[var(--muted)]"
              >
                Close
              </button>
            </div>
            <div className="mt-4">
              <UniversityOrganisationDetailsReadOnly
                universityName={selected.name}
                universityCode={selected.code}
                location={selected.location ?? selected.locationLine}
                streams={selected.streams}
                hostel={selected.hostel}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
