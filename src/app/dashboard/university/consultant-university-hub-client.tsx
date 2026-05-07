"use client";

import Link from "next/link";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ConsultantLeadsClient } from "@/app/dashboard/consultant/leads/consultant-leads-client";

type UniCard = { id: string; name: string; code: string; logoUrl: string | null };
type Stream = { id: string; name: string };

type InitialContext = {
  universityId: string;
  universityName: string;
  universityCode: string;
  streams: Stream[];
  universities: UniCard[];
};

export function ConsultantUniversityHubClient({ initial }: { initial: InitialContext }) {
  const router = useRouter();
  const [universities] = React.useState(initial.universities);
  const [selectedId, setSelectedId] = React.useState(initial.universityId);
  const [universityName, setUniversityName] = React.useState(initial.universityName);
  const [universityCode, setUniversityCode] = React.useState(initial.universityCode);
  const [streams, setStreams] = React.useState(initial.streams);
  const [loadingScoped, setLoadingScoped] = React.useState(false);

  async function applyUniversityScope(universityId: string) {
    setSelectedId(universityId);
    setLoadingScoped(true);
    try {
      const res = await fetch(`/api/consultant/leads-context?universityId=${encodeURIComponent(universityId)}`);
      const data = (await res.json().catch(() => ({}))) as {
        universityName?: string;
        universityCode?: string;
        streams?: Stream[];
      };
      if (res.ok && data.universityName && data.streams) {
        setUniversityName(data.universityName);
        setUniversityCode(data.universityCode ?? "");
        setStreams(data.streams);
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

  return (
    <>
      <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
        <div className="border-b border-[var(--border)] pb-5">
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Your universities</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--foreground-muted)]">
            Open academic years or add partner leads. Leads below follow the university you choose with{" "}
            <strong className="text-[var(--foreground)]">+ Lead</strong>.
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
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                  <Link
                    href={`/dashboard/university/${u.id}/admissions/academic-years`}
                    className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                  >
                    Academic years →
                  </Link>
                  <button
                    type="button"
                    disabled={loadingScoped}
                    onClick={() => void applyUniversityScope(u.id)}
                    className="rounded-lg border border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 px-3 py-1 text-sm font-semibold text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/20 disabled:opacity-50"
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
        hubLayout
        showBulkUpload={false}
        setActiveUniversityOnMount={false}
      />
    </>
  );
}
