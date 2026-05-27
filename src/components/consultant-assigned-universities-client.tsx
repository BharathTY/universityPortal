"use client";

import * as React from "react";
import { UniversityOrganisationDetailsReadOnly } from "@/components/university-organisation-details-read-only";
import type { HostelFeesInitial } from "@/app/dashboard/master/universities/[id]/details/university-details-form";

export type AssignedUniversityCard = {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  status: string;
  location: string | null;
  streams: { id: string; name: string; degreeType: string | null; streamFee: number | null }[];
  hostel: HostelFeesInitial;
};

export function ConsultantAssignedUniversitiesClient({
  universities,
}: {
  universities: AssignedUniversityCard[];
}) {
  const [selected, setSelected] = React.useState<AssignedUniversityCard | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {universities.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => setSelected(u)}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left shadow-sm transition hover:border-[var(--primary)]/40"
          >
            <div className="flex items-start gap-3">
              {u.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote logo URLs
                <img src={u.logoUrl} alt="" className="h-12 w-12 rounded-lg object-contain" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--muted)]/40 text-xs font-semibold text-[var(--foreground-muted)]">
                  {u.code.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--foreground)]">{u.name}</p>
                <p className="text-sm text-[var(--foreground-muted)]">{u.code}</p>
                {u.status !== "ACTIVE" ? (
                  <span className="mt-2 badge-pending">
                    Inactive
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-[var(--foreground-muted)]">
              {(u.location ?? "").trim() || "View programmes and hostel fees"}
            </p>
          </button>
        ))}
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
              <h2 id="uni-detail-title" className="text-lg font-semibold text-[var(--foreground)]">
                {selected.name}
              </h2>
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
                location={selected.location}
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
