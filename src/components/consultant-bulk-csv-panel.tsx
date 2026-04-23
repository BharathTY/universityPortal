"use client";

import * as React from "react";

export type BulkCsvStream = { id: string; name: string };

type Props = {
  universityName: string;
  universityCode: string;
  streams: BulkCsvStream[];
  /** Called after a successful bulk API response (e.g. refresh parent list). */
  onSuccess?: () => void | Promise<void>;
  /** When false, skip the section title (e.g. modal supplies its own heading). */
  showTitle?: boolean;
};

/** Must match column order used by the bulk API parser. */
const BULK_CSV_HEADER_LINE =
  "first name,last name,email,mobile,stream,admission state,nationality,academic year,referral first name,referral last name,referral phone,referral email";

function isBulkCsvHeaderRow(line: string): boolean {
  const h = line.toLowerCase();
  return h.includes("first name") && h.includes("email") && h.includes("stream");
}

/** Minimal two-line example for smoke-testing bulk upload (edit email to re-run). */
const BULK_CSV_SAMPLE = `${BULK_CSV_HEADER_LINE}
Test,Lead,bulk.smoke.test@example.com,98000000001,B.Tech,Karnataka,India,2026,,,,`;

export function ConsultantBulkCsvPanel(props: Props) {
  const showTitle = props.showTitle !== false;
  const [bulkText, setBulkText] = React.useState(BULK_CSV_SAMPLE);
  const [bulkResult, setBulkResult] = React.useState<string | null>(null);
  const [bulkError, setBulkError] = React.useState<string | null>(null);

  async function onBulk(e: React.FormEvent) {
    e.preventDefault();
    setBulkResult(null);
    setBulkError(null);
    let lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setBulkError("Paste at least one data row (or use Insert sample CSV).");
      return;
    }
    lines[0] = lines[0]!.replace(/^\s*header\s*:\s*/i, "").trim();
    if (!isBulkCsvHeaderRow(lines[0]!)) {
      lines = [BULK_CSV_HEADER_LINE, ...lines];
    }
    if (lines.length < 2) {
      setBulkError("Add at least one data row below the header.");
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
      setBulkError(data.error ?? "Bulk upload failed");
      return;
    }
    setBulkResult(
      `Created ${data.created ?? 0}, failed ${data.failed ?? 0}.` +
        (data.errors?.length
          ? `\n` + data.errors.map((e) => `Row ${e.row}: ${e.message}`).join("\n")
          : ""),
    );
    await props.onSuccess?.();
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

  return (
    <div>
      {showTitle ? (
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Bulk upload (CSV)</h2>
      ) : null}
      <p className={`text-sm text-[var(--foreground-muted)] ${showTitle ? "mt-1" : ""}`}>
        Header:{" "}
        <code className="text-[0.8rem]">
          first name, last name, email, mobile, stream, admission state, nationality, academic year, referral first
          name, referral last name, referral phone, referral email
        </code>
        . You can paste <strong className="font-medium text-[var(--foreground)]">only data rows</strong> — if the first
        line is not a header, the correct header is added for you. Academic year is optional (defaults to the first
        configured year).{" "}
        <strong className="font-medium text-[var(--foreground)]">Stream</strong> must match a program name for{" "}
        {props.universityName} (e.g.{" "}
        {props.streams.length ? props.streams.map((s) => s.name).join(", ") : "B.Tech, MBA — configure streams if empty"}
        ). <strong className="font-medium text-[var(--foreground)]">Admission state</strong> is the region or label you
        use on the add-lead form (e.g. Karnataka).
      </p>
      {bulkError ? <p className="mt-3 text-sm text-red-600">{bulkError}</p> : null}
      <form onSubmit={(e) => void onBulk(e)} className="mt-4 space-y-3">
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm"
          placeholder="Paste CSV here (header row + data rows)…"
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
            onClick={() => setBulkText(BULK_CSV_SAMPLE)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Insert sample CSV
          </button>
          <button
            type="button"
            onClick={downloadErrorsReport}
            disabled={!bulkResult?.includes("Row")}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download error report
          </button>
        </div>
      </form>
      {bulkResult ? (
        <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-[var(--muted)]/50 p-3 text-xs">{bulkResult}</pre>
      ) : null}
    </div>
  );
}
