"use client";

import Link from "next/link";
import * as React from "react";
import { useRouter } from "next/navigation";
import { isConsultant } from "@/lib/roles";

type Uni = { id: string; name: string; code: string; logoUrl: string | null };

type Props = {
  roles: string[];
  /** `batches` — shown above Manage Batches; `hub` — main content for /dashboard/university */
  variant: "batches" | "hub";
};

/**
 * University picker + assigned-university cards for admission partners.
 * Shown in-page on batches and university hub (header switcher is hidden on those routes).
 */
export function ConsultantInPageUniversitySection({ roles, variant }: Props) {
  const router = useRouter();
  const [universities, setUniversities] = React.useState<Uni[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!isConsultant(roles)) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/consultant-universities");
        if (!res.ok) return;
        const data = (await res.json()) as { universities?: Uni[]; activeId?: string | null };
        if (cancelled) return;
        setUniversities(data.universities ?? []);
        setActiveId(data.activeId ?? null);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roles]);

  async function onSelectUniversity(e: React.ChangeEvent<HTMLSelectElement>) {
    const universityId = e.target.value;
    if (!universityId || universityId === activeId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/active-university", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universityId }),
      });
      if (!res.ok) return;
      setActiveId(universityId);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!isConsultant(roles) || !loaded || universities.length === 0) {
    return null;
  }

  const hubCopy =
    variant === "hub"
      ? "Choose a university to open academic years and leads. Set your active university below when you work with more than one."
      : "Your active university applies to Partner leads and other tools. Open academic years from a card, or manage batches below.";

  return (
    <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {variant === "hub" ? (
            <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Your universities</h1>
          ) : (
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Your universities</h2>
          )}
          <p className="mt-1 max-w-2xl text-sm text-[var(--foreground-muted)]">{hubCopy}</p>
        </div>
        {universities.length > 1 ? (
          <label className="flex w-full shrink-0 flex-col gap-1 sm:w-auto sm:min-w-[12rem]">
            <span className="text-xs font-medium text-[var(--foreground-muted)]">Active university</span>
            <select
              value={activeId ?? ""}
              onChange={(e) => void onSelectUniversity(e)}
              disabled={busy}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm outline-none ring-[var(--primary)] focus:ring-2 disabled:opacity-60"
            >
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-[var(--foreground-muted)]">
            <span className="font-medium text-[var(--foreground)]">{universities[0]!.name}</span> ({universities[0]!.code})
          </p>
        )}
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {universities.map((u) => (
          <li key={u.id}>
            <Link
              href={`/dashboard/university/${u.id}/admissions/academic-years`}
              className={`flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm transition hover:border-[var(--primary)]/40 hover:shadow-md ${
                u.id === activeId ? "ring-2 ring-[var(--accent-blue)]/40" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {u.logoUrl ? (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-1">
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
              <p className="mt-3 text-sm font-medium text-[var(--primary)]">Academic years →</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
