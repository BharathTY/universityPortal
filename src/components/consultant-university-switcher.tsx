"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { isConsultant } from "@/lib/roles";

type Uni = { id: string; name: string; code: string };

type Props = {
  roles: string[];
};

/** Shown when a consultant has more than one assigned university. */
export function ConsultantUniversitySwitcher({ roles }: Props) {
  const router = useRouter();
  const [universities, setUniversities] = React.useState<Uni[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roles]);

  if (!isConsultant(roles) || universities.length <= 1) {
    return null;
  }

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
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

  return (
    <label className="flex min-w-0 max-w-[min(100vw-12rem,14rem)] flex-col gap-0.5 sm:max-w-xs">
      <span className="sr-only">Active university</span>
      <select
        value={activeId ?? ""}
        onChange={(e) => void onChange(e)}
        disabled={busy}
        className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm outline-none ring-[var(--primary)] focus:ring-2 disabled:opacity-60"
      >
        {universities.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.code})
          </option>
        ))}
      </select>
    </label>
  );
}
