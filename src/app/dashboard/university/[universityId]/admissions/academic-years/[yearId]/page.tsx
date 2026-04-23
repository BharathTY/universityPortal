import Link from "next/link";
import { notFound } from "next/navigation";
import { AdmissionReviewStatus, LeadPipelineStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly } from "@/lib/roles";
import { assertUniversityScope } from "@/lib/university-scope";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  ADMITTED: "Admitted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

function formatDateTime(d: Date) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

type PageProps = {
  params: Promise<{ universityId: string; yearId: string }>;
  searchParams: Promise<{ page?: string }>;
};

/** Leads for this academic year; metrics are scoped to this university + year (and to you if you are an admission partner). */
export default async function AcademicYearLeadsPage(props: PageProps) {
  const session = await requireAuth();
  const { universityId, yearId } = await props.params;
  await assertUniversityScope(session, universityId);

  const sp = await props.searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 25;

  const consultantOnly = isConsultantOnly(session.roles);

  const [year, university] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { id: yearId, universityId },
      select: { id: true, label: true, sortOrder: true },
    }),
    prisma.university.findUnique({
      where: { id: universityId },
      select: { name: true, code: true },
    }),
  ]);
  if (!year) notFound();

  const listWhere = {
    universityId,
    academicYearId: yearId,
    ...(consultantOnly ? { createdByUserId: session.sub } : {}),
  };

  const metricsLeadBase = listWhere;

  const [total, leadsNew, leadsLost, leadsConverted, applications, admissionsApproved] = await Promise.all([
    prisma.admissionLead.count({ where: listWhere }),
    prisma.admissionLead.count({
      where: { ...metricsLeadBase, pipelineStatus: LeadPipelineStatus.NEW },
    }),
    prisma.admissionLead.count({
      where: { ...metricsLeadBase, pipelineStatus: LeadPipelineStatus.LOST },
    }),
    prisma.admissionLead.count({
      where: { ...metricsLeadBase, pipelineStatus: LeadPipelineStatus.CONVERTED },
    }),
    prisma.application.count({
      where: {
        universityId,
        lead: { academicYearId: yearId },
        ...(consultantOnly ? { user: { studentOfId: session.sub } } : {}),
      },
    }),
    prisma.application.count({
      where: {
        universityId,
        lead: { academicYearId: yearId },
        admissionReview: AdmissionReviewStatus.APPROVED,
        ...(consultantOnly ? { user: { studentOfId: session.sub } } : {}),
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const leads = await prisma.admissionLead.findMany({
    where: listWhere,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    include: {
      stream: { select: { name: true } },
    },
  });

  const hubHref = "/dashboard/university";
  const listHref = `/dashboard/university/${universityId}/admissions/academic-years`;
  const pageHref = (p: number) =>
    p <= 1
      ? `/dashboard/university/${universityId}/admissions/academic-years/${yearId}`
      : `/dashboard/university/${universityId}/admissions/academic-years/${yearId}?page=${p}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="text-sm text-[var(--foreground-muted)]" aria-label="Breadcrumb">
        <Link href={hubHref} className="text-[var(--primary)] underline underline-offset-2">
          Universities
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={listHref} className="text-[var(--primary)] underline underline-offset-2">
          {university?.name ?? "University"} ({university?.code ?? "—"})
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-[var(--foreground)]">{year.label}</span>
      </nav>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">{year.label}</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        {consultantOnly
          ? "Counts below are for your leads and students on this intake only."
          : "Counts below are for this university and academic year."}{" "}
        {total > pageSize ? `Table: page ${safePage} of ${totalPages} (${total} leads).` : `${total} lead${total === 1 ? "" : "s"} in the table below.`}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">Leads (open)</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{leadsNew}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">Applications</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{applications}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">
            Admissions (approved)
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{admissionsApproved}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">Lost leads</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{leadsLost}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--foreground-muted)]">
        Converted leads (pipeline):{" "}
        <span className="font-medium text-[var(--foreground)]">{leadsConverted}</span>
      </p>

      {leads.length === 0 ? (
        <p className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">
          No leads for this year yet.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-[var(--foreground-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">First name</th>
                <th className="px-4 py-3 font-medium">Last name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Stream</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">{row.firstName}</td>
                  <td className="px-4 py-3 text-[var(--foreground)]">{row.lastName}</td>
                  <td className="px-4 py-3 text-[var(--foreground-muted)]">{row.email}</td>
                  <td className="px-4 py-3 tabular-nums text-[var(--foreground-muted)]">{row.mobile}</td>
                  <td className="px-4 py-3 text-[var(--foreground-muted)]">{row.stream.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)]">
                      {statusLabel[row.admissionStatus] ?? row.admissionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--foreground-muted)]">
                    {formatDateTime(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--foreground-muted)]">
          <span>
            Page {safePage} of {totalPages}
          </span>
          <div className="flex gap-3">
            {safePage > 1 ? (
              <Link className="underline" href={pageHref(safePage - 1)}>
                Previous
              </Link>
            ) : null}
            {safePage < totalPages ? (
              <Link className="underline" href={pageHref(safePage + 1)}>
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <Link
        href={listHref}
        className="mt-8 inline-block text-sm font-medium text-[var(--primary)] underline underline-offset-2"
      >
        ← Back to academic years
      </Link>
    </div>
  );
}
