"use client";

import Link from "next/link";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ConsultantLeadsClientWithBoundary } from "@/app/dashboard/consultant/leads/consultant-leads-client-boundary";

type UniCard = { id: string; name: string; code: string; logoUrl: string | null; status: "ACTIVE" | "INACTIVE" };
type Stream = { id: string; name: string };
type AcademicYearOption = { id: string; label: string };

type InitialContext = {
  universityId: string;
  universityName: string;
  universityCode: string;
  streams: Stream[];
  academicYears: AcademicYearOption[];
  universities: UniCard[];
};

export function ConsultantUniversityHubClient({ initial }: { initial: InitialContext }) {
  const universityDetailsLabel = "View University Details";
  const router = useRouter();
  const [universities] = React.useState(initial.universities);
  const [selectedId, setSelectedId] = React.useState(initial.universityId);
  const [universityName, setUniversityName] = React.useState(initial.universityName);
  const [universityCode, setUniversityCode] = React.useState(initial.universityCode);
  const [streams, setStreams] = React.useState(initial.streams);
  const [academicYears, setAcademicYears] = React.useState(initial.academicYears);
  const [loadingScoped, setLoadingScoped] = React.useState(false);

  async function syncUniversityScope(universityId: string): Promise<boolean> {
    const uni = universities.find((u) => u.id === universityId);
    if (!uni || uni.status !== "ACTIVE") return false;
    setLoadingScoped(true);
    try {
      const res = await fetch(`/api/consultant/leads-context?universityId=${encodeURIComponent(universityId)}`);
      const data = (await res.json().catch(() => ({}))) as {
        universityName?: string;
        universityCode?: string;
        streams?: Stream[];
        academicYears?: AcademicYearOption[];
      };
      if (!res.ok || !data.universityName || !data.streams) {
        return false;
      }
      setSelectedId(universityId);
      setUniversityName(data.universityName);
      setUniversityCode(data.universityCode ?? "");
      setStreams(data.streams);
      setAcademicYears(data.academicYears ?? []);
      await fetch("/api/auth/active-university", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universityId }),
      });
      router.refresh();
      return true;
    } finally {
      setLoadingScoped(false);
    }
  }

  async function onPlusLead(universityId: string) {
    const uni = universities.find((u) => u.id === universityId);
    if (!uni || uni.status !== "ACTIVE") return;
    const ok = await syncUniversityScope(universityId);
    if (ok) {
      router.push(`/dashboard/consultant/leads/new?universityId=${encodeURIComponent(universityId)}`);
    }
  }

  return (
    <>
      <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
        <div className="border-b border-[var(--border)] pb-5">
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Your universities</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--foreground-muted)]">
            <strong className="text-[var(--foreground)]">Click a card</strong> to view leads for that university. Use{" "}
            <strong className="text-[var(--foreground)]">{universityDetailsLabel}</strong> for the organisation
            profile (location, programs, hostel fees) — read-only, maintained by the master administrator. Use{" "}
            <strong className="text-[var(--foreground)]">+ Lead</strong> to open the form and capture a new prospect.
          </p>
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => {
            const isActive = u.status === "ACTIVE";
            return (
            <li key={u.id}>
              <div
                className={`flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm ${
                  u.id === selectedId ? "ring-2 ring-[var(--accent-blue)]/40" : ""
                } ${!isActive ? "opacity-80" : ""}`}
              >
                <button
                  type="button"
                  disabled={loadingScoped || !isActive}
                  onClick={() => void syncUniversityScope(u.id)}
                  className="flex w-full flex-1 flex-col rounded-t-xl p-4 text-left outline-none transition hover:bg-[var(--muted)]/35 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/45 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    {u.logoUrl ? (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote logo URLs */}
                        <img src={u.logoUrl} alt={`${u.name} logo`} className="max-h-full max-w-full object-contain" />
                      </span>
                    ) : (
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg brand-logo-gradient text-xs font-bold text-white"
                        aria-hidden
                      >
                        {u.code.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[var(--foreground)]">{u.name}</p>
                        {!isActive ? (
                          <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--foreground-muted)]">
                            Inactive
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-[var(--foreground-muted)]">{u.code}</p>
                    </div>
                  </div>
                  <span className="sr-only">View leads for {u.name}</span>
                </button>
                <div className="flex flex-col gap-2 border-t border-[var(--border)] p-4 pt-3">
                  <Link
                    href={`/dashboard/university/${u.id}/organisation-details`}
                    className="flex w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-center text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
                  >
                    {universityDetailsLabel}
                  </Link>
                  <button
                    type="button"
                    disabled={loadingScoped || !isActive}
                    onClick={() => void onPlusLead(u.id)}
                    className="w-full rounded-lg border border-[var(--accent-blue)] bg-[var(--accent-blue)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    + Lead
                  </button>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      </section>

      <ConsultantLeadsClientWithBoundary
        layoutMode="hub"
        universityId={selectedId}
        universityName={universityName}
        universityCode={universityCode}
        streams={streams}
        academicYears={academicYears}
        showBulkUpload={false}
        setActiveUniversityOnMount={false}
      />
    </>
  );
}
