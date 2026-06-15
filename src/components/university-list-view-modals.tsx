"use client";

import * as React from "react";
import type { ScholarshipType } from "@prisma/client";
import { SCHOLARSHIP_TYPE_LABELS } from "@/lib/university-scholarship";

type OverviewSpoc = {
  name: string;
  designation: string;
  mobile: string;
  email: string;
};

type OverviewProgram = {
  programLevel: string | null;
  programName: string | null;
  streamName: string;
  targetStudents: number;
  tuitionYear1: string | null;
  tuitionTotal: string | null;
};

type OverviewHostel = {
  gender: string;
  roomType: string;
  sharing: string;
  amount: string | null;
};

type OverviewData = {
  spocs: OverviewSpoc[];
  programs: OverviewProgram[];
  cetSeats: {
    programLevel: string;
    programName: string | null;
    streamName: string;
    allocationMode: string;
    allocationValue: string | null;
    seatCount: number;
  }[];
  scholarships: { type: string; value: string; criteria: string[] }[];
  hostelFees: OverviewHostel[];
  foodFee: string | null;
  examFee: string | null;
  otherAdminCharges: string | null;
  otherAdminAmount: string | null;
  admissionsCount: number;
};

type ModalKind = "spoc" | "programs" | "hostel" | null;

type Props = {
  universityId: string;
  universityName: string;
};

function formatSharing(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function UniversityListViewModals({ universityId, universityName }: Props) {
  const [open, setOpen] = React.useState<ModalKind>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<OverviewData | null>(null);

  async function load(kind: ModalKind) {
    if (!kind) return;
    setOpen(kind);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/master/universities/${universityId}/overview`);
      const json = (await res.json().catch(() => ({}))) as OverviewData & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not load details");
        setData(null);
        return;
      }
      setData(json);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(null);
    setError(null);
  }

  const title =
    open === "spoc"
      ? "SPOC details"
      : open === "programs"
        ? "Degree program details"
        : open === "hostel"
          ? "Hostel fee details"
          : "";

  return (
    <>
      <div className="flex flex-col gap-1">
        <button type="button" onClick={() => void load("spoc")} className="text-left text-xs font-medium text-[var(--primary)] hover:underline">
          View SPOC
        </button>
        <button type="button" onClick={() => void load("programs")} className="text-left text-xs font-medium text-[var(--primary)] hover:underline">
          View programs
        </button>
        <button type="button" onClick={() => void load("hostel")} className="text-left text-xs font-medium text-[var(--primary)] hover:underline">
          View hostel fees
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="presentation">
          <button type="button" className="absolute inset-0 bg-black/45" aria-label="Dismiss" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[121] flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
          >
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
              <p className="mt-0.5 text-sm text-[var(--foreground-muted)]">{universityName}</p>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {busy ? (
                <p className="text-sm text-[var(--foreground-muted)]">Loading…</p>
              ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : !data ? (
                <p className="text-sm text-[var(--foreground-muted)]">No data.</p>
              ) : open === "spoc" ? (
                data.spocs.length === 0 ? (
                  <p className="text-sm text-[var(--foreground-muted)]">No SPOC records.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="py-2 pr-3">Name</th>
                        <th className="py-2 pr-3">Designation</th>
                        <th className="py-2 pr-3">Mobile</th>
                        <th className="py-2">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.spocs.map((s, i) => (
                        <tr key={i} className="border-b border-[var(--border)] last:border-0">
                          <td className="py-2 pr-3">{s.name}</td>
                          <td className="py-2 pr-3">{s.designation}</td>
                          <td className="py-2 pr-3 tabular-nums">{s.mobile}</td>
                          <td className="py-2">{s.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : open === "programs" ? (
                data.programs.length === 0 ? (
                  <p className="text-sm text-[var(--foreground-muted)]">No programs configured.</p>
                ) : (
                  <div className="space-y-3">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          <th className="py-2 pr-2">Type</th>
                          <th className="py-2 pr-2">Program</th>
                          <th className="py-2 pr-2">Stream</th>
                          <th className="py-2 pr-2">Target</th>
                          <th className="py-2 pr-2">Tuition (annual)</th>
                          <th className="py-2">Package</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.programs.map((p, i) => (
                          <tr key={i} className="border-b border-[var(--border)] last:border-0">
                            <td className="py-2 pr-2">{p.programLevel ?? "—"}</td>
                            <td className="py-2 pr-2">{p.programName ?? "—"}</td>
                            <td className="py-2 pr-2">{p.streamName}</td>
                            <td className="py-2 pr-2 tabular-nums">{p.targetStudents || "—"}</td>
                            <td className="py-2 pr-2 tabular-nums">{p.tuitionYear1 ?? "—"}</td>
                            <td className="py-2 tabular-nums">{p.tuitionTotal ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.cetSeats.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-semibold">CET allocation</h3>
                        <ul className="mt-1 space-y-1 text-sm">
                          {data.cetSeats.map((c, i) => (
                            <li key={i}>
                              {c.programLevel}
                              {c.programName ? ` · ${c.programName}` : ""} · {c.streamName}:{" "}
                              {c.allocationMode === "PERCENT"
                                ? `${c.allocationValue ?? c.seatCount}% of intake`
                                : `${c.seatCount || c.allocationValue} seats`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {data.scholarships.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-semibold">Scholarships (tuition only)</h3>
                        <ul className="mt-1 space-y-2 text-sm">
                          {data.scholarships.map((s, i) => (
                            <li key={i} className="rounded-lg border border-[var(--border)] px-3 py-2">
                              <span className="font-medium">
                                {SCHOLARSHIP_TYPE_LABELS[s.type as ScholarshipType] ??
                                  s.type.replace(/_/g, " ").toLowerCase()}{" "}
                                — {s.value}
                              </span>
                              {s.criteria.length > 0 ? (
                                <ul className="mt-1 list-inside list-disc text-[var(--foreground-muted)]">
                                  {s.criteria.map((criterion, j) => (
                                    <li key={j}>{criterion}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )
              ) : data.hostelFees.length === 0 && !data.foodFee && !data.examFee ? (
                <p className="text-sm text-[var(--foreground-muted)]">No hostel fee records.</p>
              ) : (
                <div className="space-y-4">
                  {data.hostelFees.length > 0 ? (
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          <th className="py-2 pr-3">Hostel</th>
                          <th className="py-2 pr-3">Room</th>
                          <th className="py-2 pr-3">Sharing</th>
                          <th className="py-2">Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.hostelFees.map((h, i) => (
                          <tr key={i} className="border-b border-[var(--border)] last:border-0">
                            <td className="py-2 pr-3 capitalize">{h.gender.toLowerCase()}</td>
                            <td className="py-2 pr-3">{h.roomType === "AC" ? "AC" : "Non-AC"}</td>
                            <td className="py-2 pr-3">{formatSharing(h.sharing)}</td>
                            <td className="py-2 tabular-nums">{h.amount ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[var(--foreground-muted)]">Food fee</dt>
                      <dd className="tabular-nums">{data.foodFee ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--foreground-muted)]">Exam fee</dt>
                      <dd className="tabular-nums">{data.examFee ?? "—"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[var(--foreground-muted)]">Administrative charges</dt>
                      <dd>
                        {data.otherAdminCharges ?? "—"}
                        {data.otherAdminAmount ? ` (${data.otherAdminAmount})` : ""}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
            <div className="border-t border-[var(--border)] px-5 py-3 text-right">
              <button type="button" onClick={close} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted)]">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
