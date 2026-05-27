import Link from "next/link";
import type { ConsultantDashboardSnapshot } from "@/lib/consultant-dashboard-data";

type Props = {
  title: string;
  subtitle: string;
  snapshot: ConsultantDashboardSnapshot;
  showMouPanel: boolean;
  leadsHref?: string;
};

function formatDate(iso: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(iso);
}

export function ConsultantDashboardView({
  title,
  subtitle,
  snapshot,
  showMouPanel,
  leadsHref = "/dashboard/consultant/leads",
}: Props) {
  const { counts, seatSummary, mouDocuments, recentLeads } = snapshot;

  const summaryCards = [
    { label: "My Leads", value: counts.myLeads, href: leadsHref },
    {
      label: "Assigned Universities",
      value: counts.assignedUniversities,
      href: "/dashboard/consultant/assigned-universities",
    },
    {
      label: "Pending Payments",
      value: counts.pendingPayments,
      href: "/dashboard/consultant/invoices?status=pending",
    },
    {
      label: "Completed Payments",
      value: counts.completedPayments,
      href: "/dashboard/consultant/invoices?status=completed",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{title}</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">{subtitle}</p>
        </div>
        <Link
          href={`${leadsHref}?action=add`}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[var(--primary-hover)]"
        >
          Add Lead
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-[var(--primary)]/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">{card.value}</p>
          </Link>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Seat summary</h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Total capacity across streams on your assigned universities.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Total seats</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-[var(--foreground)]">{seatSummary.total}</dd>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Filled</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-[var(--foreground)]">{seatSummary.filled}</dd>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Remaining</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-[var(--foreground)]">{seatSummary.remaining}</dd>
          </div>
        </dl>
      </section>

      {showMouPanel ? (
        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">MOU documents</h2>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Memoranda of understanding uploaded for your consultant account.
          </p>
          {mouDocuments.length === 0 ? (
            <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 px-4 py-6 text-center text-sm text-[var(--foreground-muted)]">
              No MOU documents uploaded yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[var(--foreground-muted)]">File</th>
                    <th className="px-4 py-3 font-semibold text-[var(--foreground-muted)]">Academic year</th>
                    <th className="px-4 py-3 font-semibold text-[var(--foreground-muted)]">Uploaded</th>
                    <th className="px-4 py-3 text-right font-semibold text-[var(--foreground-muted)]">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {mouDocuments.map((doc) => (
                    <tr key={doc.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">{doc.fileName}</td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">{doc.academicYear}</td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">{formatDate(doc.uploadedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent leads</h2>
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">Latest prospects you added.</p>
          </div>
          <Link
            href={leadsHref}
            className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
          >
            View all leads
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">
            No leads yet. Use <strong className="text-[var(--foreground)]">Add Lead</strong> to create your first prospect.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">University</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Ageing</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{lead.name}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{lead.email}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{lead.universityName}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{lead.status}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--foreground-muted)]">{lead.ageingDays}</td>
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
