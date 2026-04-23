import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  params: Promise<{ universityId: string; streamId: string }>;
  searchParams: Promise<{ page?: string }>;
};

/** All leads for this program/stream (no redirect to academic years). */
export default async function StreamLeadsPage(props: PageProps) {
  const session = await requireAuth();
  const { universityId, streamId } = await props.params;
  await assertUniversityScope(session, universityId);

  const sp = await props.searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 25;

  const stream = await prisma.stream.findFirst({
    where: { id: streamId, universityId },
    select: { id: true, name: true, sortOrder: true },
  });
  if (!stream) notFound();

  const where = { universityId, streamId };

  const total = await prisma.admissionLead.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const leads = await prisma.admissionLead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    include: {
      academicYear: { select: { label: true } },
    },
  });

  const listHref = `/dashboard/university/${universityId}/admissions/streams`;
  const pageHref = (p: number) =>
    p <= 1
      ? `/dashboard/university/${universityId}/admissions/streams/${streamId}`
      : `/dashboard/university/${universityId}/admissions/streams/${streamId}?page=${p}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="text-sm text-[var(--foreground-muted)]">
        <Link href={listHref} className="text-[var(--primary)] underline underline-offset-2">
          Streams
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-[var(--foreground)]">{stream.name}</span>
      </nav>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">{stream.name}</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        All leads for this program ({total} total{total > pageSize ? ` — showing page ${safePage} of ${totalPages}` : ""}).
      </p>

      {leads.length === 0 ? (
        <p className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">
          No leads for this stream yet.
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
                <th className="px-4 py-3 font-medium">Academic year</th>
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
                  <td className="px-4 py-3 text-[var(--foreground-muted)]">{row.academicYear.label}</td>
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
        ← Back to streams
      </Link>
    </div>
  );
}
