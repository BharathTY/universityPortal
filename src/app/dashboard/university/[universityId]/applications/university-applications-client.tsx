"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

type Year = { id: string; label: string };
type Stream = { id: string; name: string };

type AppRow = {
  id: string;
  displayId: string;
  studentName: string;
  mobile: string;
  course: string;
  status: string;
  leadCreatedAt: string;
};

type Props = {
  universityId: string;
  universityName: string;
  years: Year[];
  streams: Stream[];
  applications: AppRow[];
};

const reviewLabel: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function UniversityApplicationsClient(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(next: { year?: string | null; stream?: string | null }) {
    const p = new URLSearchParams(searchParams.toString());
    const y = next.year !== undefined ? next.year : searchParams.get("year");
    const s = next.stream !== undefined ? next.stream : searchParams.get("stream");
    if (y) p.set("year", y);
    else p.delete("year");
    if (s) p.set("stream", s);
    else p.delete("stream");
    router.push(`/dashboard/university/${props.universityId}/applications?${p.toString()}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="text-sm text-[var(--foreground-muted)]">
        <span className="text-[var(--foreground)]">University</span>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-[var(--foreground)]">Applications</span>
      </nav>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">{props.universityName}</h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">Applications linked to leads — filter by year and degree.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <select
          defaultValue={searchParams.get("year") ?? ""}
          onChange={(e) => setFilter({ year: e.target.value || null })}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="">All years</option>
          {props.years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
            </option>
          ))}
        </select>
        <select
          defaultValue={searchParams.get("stream") ?? ""}
          onChange={(e) => setFilter({ stream: e.target.value || null })}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="">All degrees</option>
          {props.streams.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
            <tr>
              <th className="px-3 py-2">Application ID</th>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Mobile</th>
              <th className="px-3 py-2">Degree</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Lead created</th>
            </tr>
          </thead>
          <tbody>
            {props.applications.map((a) => (
              <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{a.displayId}</td>
                <td className="px-3 py-2">{a.studentName}</td>
                <td className="px-3 py-2">{a.mobile}</td>
                <td className="px-3 py-2">{a.course}</td>
                <td className="px-3 py-2">{reviewLabel[a.status] ?? a.status}</td>
                <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                  {new Date(a.leadCreatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-[var(--foreground-muted)]">
        Status is the university admission decision on the application (pending, approved, or rejected).
      </p>
    </div>
  );
}
