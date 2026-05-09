"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ConsultantLeadsClient } from "@/app/dashboard/consultant/leads/consultant-leads-client";

type UniCard = { id: string; name: string; code: string; logoUrl: string | null };
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
  const router = useRouter();
  const [universities] = React.useState(initial.universities);
  const [selectedId, setSelectedId] = React.useState(initial.universityId);
  const [universityName, setUniversityName] = React.useState(initial.universityName);
  const [universityCode, setUniversityCode] = React.useState(initial.universityCode);
  const [streams, setStreams] = React.useState(initial.streams);
  const [academicYears, setAcademicYears] = React.useState(initial.academicYears);
  const [loadingScoped, setLoadingScoped] = React.useState(false);
  const [leadDrawerOpen, setLeadDrawerOpen] = React.useState(false);

  async function applyUniversityScope(universityId: string) {
    setSelectedId(universityId);
    setLoadingScoped(true);
    try {
      const res = await fetch(`/api/consultant/leads-context?universityId=${encodeURIComponent(universityId)}`);
      const data = (await res.json().catch(() => ({}))) as {
        universityName?: string;
        universityCode?: string;
        streams?: Stream[];
        academicYears?: AcademicYearOption[];
      };
      if (res.ok && data.universityName && data.streams) {
        setUniversityName(data.universityName);
        setUniversityCode(data.universityCode ?? "");
        setStreams(data.streams);
        setAcademicYears(data.academicYears ?? []);
      }
      await fetch("/api/auth/active-university", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universityId }),
      });
      router.refresh();
    } finally {
      setLoadingScoped(false);
    }
  }

  async function onPlusLead(universityId: string) {
    await applyUniversityScope(universityId);
    setLeadDrawerOpen(true);
  }

  return (
    <>
      <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
        <div className="border-b border-[var(--border)] pb-5">
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Your universities</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--foreground-muted)]">
            Each card is a university you work with. Click <strong className="text-[var(--foreground)]">+ Lead</strong>{" "}
            to capture a new prospect for that institution.
          </p>
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => (
            <li key={u.id}>
              <div
                className={`flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm ${
                  u.id === selectedId ? "ring-2 ring-[var(--accent-blue)]/40" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {u.logoUrl ? (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote logo URLs */}
                      <img src={u.logoUrl} alt={`${u.name} logo`} className="max-h-full max-w-full object-contain" />
                    </span>
                  ) : (
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-xs font-bold text-white"
                      aria-hidden
                    >
                      {u.code.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--foreground)]">{u.name}</p>
                    <p className="text-sm text-[var(--foreground-muted)]">{u.code}</p>
                  </div>
                </div>
                <div className="mt-4 border-t border-[var(--border)] pt-3">
                  <button
                    type="button"
                    disabled={loadingScoped}
                    onClick={() => void onPlusLead(u.id)}
                    className="w-full rounded-lg border border-[var(--accent-blue)] bg-[var(--accent-blue)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
                  >
                    + Lead
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ConsultantLeadsClient
        universityId={selectedId}
        universityName={universityName}
        universityCode={universityCode}
        streams={streams}
        academicYears={academicYears}
        hubLayout
        addLeadInDrawer
        leadDrawerOpen={leadDrawerOpen}
        onCloseLeadDrawer={() => setLeadDrawerOpen(false)}
        showBulkUpload={false}
        setActiveUniversityOnMount={false}
      />
    </>
  );
}
