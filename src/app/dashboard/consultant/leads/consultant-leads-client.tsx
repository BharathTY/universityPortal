"use client";

import Link from "next/link";
import * as React from "react";

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
};

type Props = {
  universityName: string;
  universityCode: string;
  streams: Stream[];
};

export function ConsultantLeadsClient(props: Props) {
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

  const [bulkText, setBulkText] = React.useState("");
  const [bulkResult, setBulkResult] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/consultant/leads`);
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
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/consultant/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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

  async function onBulk(e: React.FormEvent) {
    e.preventDefault();
    setBulkResult(null);
    setError(null);
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      setError("Paste CSV with header row and data rows");
      return;
    }
    const header = lines[0]!.toLowerCase().split(",").map((s) => s.trim());
    const idx = (name: string) => header.indexOf(name);
    const rowsParsed = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const get = (h: string) => {
        const i = idx(h);
        return i >= 0 ? cols[i] ?? "" : "";
      };
      return {
        firstName: get("first name") || get("firstname"),
        lastName: get("last name") || get("lastname"),
        email: get("email"),
        mobile: get("mobile") || get("phone"),
        academicYearLabel: get("academic year") || get("year") || null,
        streamName: get("stream") || get("program") || get("course"),
        nationality: get("nationality") || null,
        admissionState: get("admission state") || get("state") || get("looking admission in which state"),
        referralFirstName: get("referral first name") || get("referral firstname") || null,
        referralLastName: get("referral last name") || get("referral lastname") || null,
        referralPhone: get("referral phone") || get("referral contact") || null,
        referralEmail: get("referral email") || null,
      };
    });
    const res = await fetch("/api/consultant/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: rowsParsed }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      created?: number;
      failed?: number;
      errors?: { row: number; message: string }[];
    };
    if (!res.ok) {
      setError(data.error ?? "Bulk upload failed");
      return;
    }
    setBulkResult(
      `Created ${data.created ?? 0}, failed ${data.failed ?? 0}.` +
        (data.errors?.length
          ? `\n` + data.errors.map((e) => `Row ${e.row}: ${e.message}`).join("\n")
          : ""),
    );
    await load();
  }

  function downloadErrorsReport() {
    if (!bulkResult || !bulkResult.includes("Row")) return;
    const blob = new Blob([bulkResult], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bulk-upload-report.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function referralSummary(r: LeadRow): string {
    const parts = [r.referralFirstName, r.referralLastName].filter(Boolean);
    if (parts.length === 0 && !r.referralPhone && !r.referralEmail) return "—";
    return [parts.join(" "), r.referralPhone, r.referralEmail].filter(Boolean).join(" · ");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="text-sm text-[var(--foreground-muted)]">
        <Link href="/dashboard/consultant" className="underline-offset-2 hover:underline">
          Dashboard
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-[var(--foreground)]">Leads</span>
      </nav>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Leads</h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        {props.universityName} ({props.universityCode})
      </p>

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
              <label className="text-sm font-medium">Stream</label>
              <select
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              >
                {props.streams.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Looking admission in which state</label>
              <input
                required
                value={admissionState}
                onChange={(e) => setAdmissionState(e.target.value)}
                placeholder="e.g. Karnataka"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              />
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
            className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white"
          >
            Add lead
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Bulk upload (CSV)</h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Header:{" "}
          <code>
            first name, last name, email, mobile, stream, admission state, nationality, academic year, referral first
            name, referral last name, referral phone, referral email
          </code>
          . Academic year is optional (defaults to the first configured year). Stream and admission state must match
          your university configuration.
        </p>
        <form onSubmit={onBulk} className="mt-4 space-y-3">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm"
            placeholder="Paste CSV here..."
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
            >
              Upload
            </button>
            <button
              type="button"
              onClick={downloadErrorsReport}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold"
            >
              Download error report
            </button>
          </div>
        </form>
        {bulkResult ? (
          <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-[var(--muted)]/50 p-3 text-xs">{bulkResult}</pre>
        ) : null}
      </section>

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
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Created</th>
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
