"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ConsultantBulkCsvPanel } from "@/components/consultant-bulk-csv-panel";
import { INDIAN_STATES_AND_UT } from "@/lib/indian-states";

type Stream = { id: string; name: string };

type LeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  pipelineStatus: string;
  createdAt: string;
  admissionState: string | null;
  referralFirstName: string | null;
  referralLastName: string | null;
  referralPhone: string | null;
  referralEmail: string | null;
  branchName: string | null;
  university: { name: string; code: string };
  stream: { name: string };
  /** Present only for Manager / Admin / Counsellor / Master API responses. */
  assignedPartnerDisplayName?: string | null;
};

type Props = {
  universityId: string;
  universityName: string;
  universityCode: string;
  streams: Stream[];
  /** POST `/api/auth/active-university` when the scoped university changes (multi-university consultants). */
  setActiveUniversityOnMount?: boolean;
  showBulkUpload?: boolean;
  hubLayout?: boolean;
};

export function ConsultantLeadsClient(props: Props) {
  const showBulk = props.showBulkUpload ?? false;
  const setActive = props.setActiveUniversityOnMount ?? false;
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<LeadRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [busyId, setBusyId] = React.useState<string | null>(null);

  const [fn, setFn] = React.useState("");
  const [ln, setLn] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [nat, setNat] = React.useState("");
  const [streamId, setStreamId] = React.useState(props.streams[0]?.id ?? "");
  const [admissionState, setAdmissionState] = React.useState("");
  const [refFn, setRefFn] = React.useState("");
  const [refLn, setRefLn] = React.useState("");
  const [refPhone, setRefPhone] = React.useState("");
  const [refEmail, setRefEmail] = React.useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ universityId: props.universityId });
      const res = await fetch(`/api/consultant/leads?${qs.toString()}`);
      const data = (await res.json().catch(() => ({}))) as { error?: string; leads?: LeadRow[] };
      if (!res.ok) {
        setError(data.error ?? "Could not load leads");
        return;
      }
      setRows(data.leads ?? []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, [props.universityId]);

  React.useEffect(() => {
    const first = props.streams[0]?.id ?? "";
    setStreamId((prev) => (props.streams.some((s) => s.id === prev) ? prev : first));
  }, [props.streams]);

  React.useEffect(() => {
    if (!setActive || !props.universityId) return;
    void (async () => {
      await fetch("/api/auth/active-university", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universityId: props.universityId }),
      });
      router.refresh();
    })();
  }, [setActive, props.universityId, router]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/consultant/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        universityId: props.universityId,
        firstName: fn,
        lastName: ln,
        email,
        mobile,
        nationality: nat || null,
        streamId,
        admissionState,
        referralFirstName: refFn || null,
        referralLastName: refLn || null,
        referralPhone: refPhone || null,
        referralEmail: refEmail || null,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not create lead");
      return;
    }
    setFn("");
    setLn("");
    setEmail("");
    setMobile("");
    setNat("");
    setAdmissionState("");
    setRefFn("");
    setRefLn("");
    setRefPhone("");
    setRefEmail("");
    await load();
  }

  async function markLost(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/consultant/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStatus: "LOST" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(data.error ?? "Could not update");
      else await load();
    } finally {
      setBusyId(null);
    }
  }

  async function convert(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/consultant/leads/${id}/convert`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(data.error ?? "Could not convert");
      else await load();
    } finally {
      setBusyId(null);
    }
  }

  const showAssignedPartnerCol = rows.some((r) =>
    Object.prototype.hasOwnProperty.call(r, "assignedPartnerDisplayName"),
  );

  function referralSummary(r: LeadRow): string {
    const parts = [r.referralFirstName, r.referralLastName].filter(Boolean);
    if (parts.length === 0 && !r.referralPhone && !r.referralEmail) return "—";
    return [parts.join(" "), r.referralPhone, r.referralEmail].filter(Boolean).join(" · ");
  }

  return (
    <div className={props.hubLayout ? "" : "mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"}>
      {!props.hubLayout ? (
        <>
          <nav className="text-sm text-[var(--foreground-muted)]">
            <Link href="/dashboard/university" className="text-[var(--primary)] underline-offset-2 hover:underline">
              Universities
            </Link>
            <span className="mx-1.5">/</span>
            <span className="font-medium text-[var(--foreground)]">Partner leads</span>
          </nav>
          <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Leads</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            {props.universityName} ({props.universityCode})
          </p>
        </>
      ) : (
        <h2 className="text-xl font-bold text-[var(--foreground)]">Partner leads</h2>
      )}

      {props.hubLayout ? (
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          {props.universityName} ({props.universityCode})
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Add lead</h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Admission partner name is recorded automatically from your account.
        </p>
        <form onSubmit={onCreate} className="mt-4 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">First name</label>
              <input
                required
                value={fn}
                onChange={(e) => setFn(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last name</label>
              <input
                required
                value={ln}
                onChange={(e) => setLn(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mobile</label>
              <input
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Degree Type</label>
              <select
                required
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              >
                {props.streams.length === 0 ? (
                  <option value="">No programs configured</option>
                ) : null}
                {props.streams.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">State</label>
              <select
                required
                value={admissionState}
                onChange={(e) => setAdmissionState(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              >
                <option value="" disabled>
                  Select state
                </option>
                {INDIAN_STATES_AND_UT.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Nationality (optional)</label>
              <input
                value={nat}
                onChange={(e) => setNat(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Referral (optional)</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">First name</label>
                <input
                  value={refFn}
                  onChange={(e) => setRefFn(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last name</label>
                <input
                  value={refLn}
                  onChange={(e) => setRefLn(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contact</label>
                <input
                  value={refPhone}
                  onChange={(e) => setRefPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={refEmail}
                  onChange={(e) => setRefEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={props.streams.length === 0 || !streamId}
            className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add lead
          </button>
        </form>
      </section>

      {showBulk ? (
        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <ConsultantBulkCsvPanel
            universityName={props.universityName}
            universityCode={props.universityCode}
            streams={props.streams}
            onSuccess={() => void load()}
          />
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Your leads</h2>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">Loading…</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                <tr>
                  <th className="px-3 py-2">First</th>
                  <th className="px-3 py-2">Last</th>
                  <th className="px-3 py-2">Mobile</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">Referral</th>
                  <th className="px-3 py-2">Branch</th>
                  <th className="px-3 py-2">University</th>
                  <th className="px-3 py-2">Degree Type</th>
                  <th className="px-3 py-2">Created</th>
                  {showAssignedPartnerCol ? <th className="px-3 py-2">Assigned partner</th> : null}
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-2">{r.firstName}</td>
                    <td className="px-3 py-2">{r.lastName}</td>
                    <td className="px-3 py-2">{r.mobile}</td>
                    <td className="px-3 py-2">{r.email}</td>
                    <td className="px-3 py-2">{r.admissionState ?? "—"}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2 text-xs" title={referralSummary(r)}>
                      {referralSummary(r)}
                    </td>
                    <td className="px-3 py-2">{r.branchName ?? "—"}</td>
                    <td className="px-3 py-2">{r.university.name}</td>
                    <td className="px-3 py-2">{r.stream.name}</td>
                    <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    {showAssignedPartnerCol ? (
                      <td className="max-w-[10rem] truncate px-3 py-2 text-xs" title={r.assignedPartnerDisplayName ?? ""}>
                        {r.assignedPartnerDisplayName ?? "—"}
                      </td>
                    ) : null}
                    <td className="px-3 py-2">{r.pipelineStatus}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {r.pipelineStatus === "NEW" ? (
                          <>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => void convert(r.id)}
                              className="text-[var(--primary)] underline"
                            >
                              Convert
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => void markLost(r.id)}
                              className="text-red-600 underline"
                            >
                              Lost
                            </button>
                          </>
                        ) : (
                          <span className="text-[var(--foreground-muted)]">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
