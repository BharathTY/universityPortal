"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import QRCode from "qrcode";
import { ConsultantBulkCsvPanel } from "@/components/consultant-bulk-csv-panel";
import { ListQueryToolbar, SORT_LEADS } from "@/components/list-controls";
import type { BatchLeadListRow, BatchLeadsBulkConsultant } from "@/lib/batch-leads-view-model";
import { PORTAL_BRAND_NAME } from "@/components/portal-logo";


export type { BatchLeadListRow, BatchLeadsBulkConsultant };

type LeadsViewProps = {
  batchId: string;
  batchTitle: string;
  batchCode: string;
  /** Public path without origin, e.g. `/ref/abc…` — used for brochure QR and Lead Punch. */
  referralFormPath: string;
  /** When set, Bulk Upload opens the same CSV flow as Partner leads (`POST /api/consultant/leads/bulk`). */
  bulkConsultant?: BatchLeadsBulkConsultant | null;
  /** Lead Punch / brochure referrals for this batch (also listed in the assigned partner’s pipeline). */
  leads?: BatchLeadListRow[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  q?: string;
  sort?: string;
  /** When true, show the saved assigned partner snapshot (Manager / Admin / Counsellor / Master). */
  showAssignedPartnerColumn?: boolean;
};

function formatLeadWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function LeadsView({
  batchId,
  batchTitle,
  batchCode,
  referralFormPath,
  bulkConsultant,
  leads = [],
  total = 0,
  page = 1,
  pageSize = 25,
  totalPages = 1,
  q = "",
  sort = "latest",
  showAssignedPartnerColumn = false,
}: LeadsViewProps) {
  const router = useRouter();
  const [punchOpen, setPunchOpen] = React.useState(false);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [copyHint, setCopyHint] = React.useState<string | null>(null);

  const fullReferralUrl =
    typeof window !== "undefined" ? `${window.location.origin}${referralFormPath}` : referralFormPath;

  React.useEffect(() => {
    if (!punchOpen) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(fullReferralUrl, {
      width: 220,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [punchOpen, fullReferralUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullReferralUrl);
      setCopyHint("Link copied");
      setTimeout(() => setCopyHint(null), 2500);
    } catch {
      setCopyHint("Select and copy the link manually");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="border-b border-[var(--border)] pb-4">
        <nav className="text-sm text-[var(--foreground-muted)]" aria-label="Breadcrumb">
          <span className="text-[var(--foreground)]">{PORTAL_BRAND_NAME}</span>
          <span className="mx-1.5">/</span>
          <Link href="/dashboard/batches" className="hover:text-[var(--foreground)] hover:underline">
            Batches
          </Link>
          <span className="mx-1.5">/</span>
          <span className="font-medium text-[var(--foreground)]">{batchTitle}</span>
        </nav>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Leads</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Manage and track all leads for this batch ({batchCode})
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            disabled={!bulkConsultant}
            title={
              bulkConsultant
                ? undefined
                : "Bulk CSV needs a linked organisation: sign in as university staff, an admission partner with a university, or open a batch whose owner belongs to your org."
            }
            onClick={() => bulkConsultant && setBulkOpen(true)}
            className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-blue-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Bulk Upload
          </button>
          <button
            type="button"
            onClick={() => setPunchOpen(true)}
            className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-blue-hover)]"
          >
            Lead Punch
          </button>
        </div>
      </div>

      {bulkOpen && bulkConsultant ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-upload-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h2 id="bulk-upload-title" className="text-lg font-semibold text-[var(--foreground)]">
              Bulk upload (CSV)
            </h2>
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">
              Leads are created for {bulkConsultant.universityName} ({bulkConsultant.universityCode}), same as on
              Partner leads.
            </p>
            <div className="mt-4">
              <ConsultantBulkCsvPanel
                batchId={batchId}
                universityName={bulkConsultant.universityName}
                universityCode={bulkConsultant.universityCode}
                streams={bulkConsultant.streams}
                showTitle={false}
                onSuccess={() => router.refresh()}
              />
            </div>
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="mt-6 w-full rounded-lg border border-[var(--border)] py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {punchOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-punch-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h2 id="lead-punch-title" className="text-lg font-semibold text-[var(--foreground)]">
              Brochure &amp; QR — Lead Punch
            </h2>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              Anyone can open this link or scan the QR code to submit a referral for <strong>{batchTitle}</strong> (
              {batchCode}). Submissions are saved against this batch and listed below; they also appear in the assigned
              admission partner&apos;s pipeline for their linked university.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4">
              {qrDataUrl ? (
                // Data URL — next/image is not used for inline QR bitmaps.
                // eslint-disable-next-line @next/next/no-img-element -- data: URL from qrcode package
                <img src={qrDataUrl} width={220} height={220} className="rounded-lg border border-[var(--border)]" alt="" />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--foreground-muted)]">
                  Generating QR…
                </div>
              )}
              <p className="break-all text-center text-xs text-[var(--foreground-muted)]">{fullReferralUrl}</p>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
                >
                  Copy link
                </button>
                <a
                  href={referralFormPath}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)]"
                >
                  Open form
                </a>
              </div>
              {copyHint ? <p className="text-center text-xs text-[var(--foreground-muted)]">{copyHint}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => setPunchOpen(false)}
              className="mt-6 w-full rounded-lg border border-[var(--border)] py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        <ListQueryToolbar
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          q={q}
          sort={sort}
          sortOptions={SORT_LEADS}
          searchPlaceholder="Name, email, or mobile"
          itemLabel="lead"
        />

        <div className="mt-4 overflow-x-auto overflow-y-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--muted)]/50 text-[var(--foreground-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">First name</th>
                <th className="px-4 py-3 font-medium">Last name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">State / note</th>
                <th className="px-4 py-3 font-medium">Pipeline</th>
                <th className="px-4 py-3 font-medium">Created</th>
                {showAssignedPartnerColumn ? (
                  <th className="px-4 py-3 font-medium">Assigned partner</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={showAssignedPartnerColumn ? 8 : 7}
                    className="px-4 py-16 text-center text-[var(--foreground-muted)]"
                  >
                    No leads for this batch yet — use Lead Punch (QR / link) or Bulk Upload (partner CSV).
                  </td>
                </tr>
              ) : (
                leads.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{row.firstName}</td>
                    <td className="px-4 py-3">{row.lastName}</td>
                    <td className="max-w-[14rem] truncate px-4 py-3" title={row.email}>
                      {row.email}
                    </td>
                    <td className="px-4 py-3">{row.mobile}</td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-xs" title={row.admissionState ?? ""}>
                      {row.admissionState ?? "—"}
                    </td>
                    <td className="px-4 py-3">{row.pipelineStatus}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--foreground-muted)]">
                      {formatLeadWhen(row.createdAt)}
                    </td>
                    {showAssignedPartnerColumn ? (
                      <td className="max-w-[12rem] px-4 py-3 text-xs" title={row.assignedPartnerDisplayName ?? ""}>
                        {row.assignedPartnerDisplayName ?? "—"}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
