import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { ListQueryToolbar, SORT_APPLICATIONS } from "@/components/list-controls";
import { requireAuth } from "@/lib/auth";
import {
  applicationOrderBy,
  applicationTextSearchWhere,
  paginationMeta,
  parsePage,
  parsePageSize,
  searchParamOne,
} from "@/lib/list-query";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";

export const dynamic = "force-dynamic";

type SearchProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MasterApplicationsPage(props: SearchProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const sp = await props.searchParams;
  const q = searchParamOne(sp, "q");
  const sort = searchParamOne(sp, "sort") ?? "latest";
  const page = parsePage(searchParamOne(sp, "page"));
  const pageSize = parsePageSize(searchParamOne(sp, "pageSize"), 25);

  const textWhere = applicationTextSearchWhere(q);
  const where: Prisma.ApplicationWhereInput = textWhere ?? {};

  const [total, applications] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      orderBy: applicationOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        referenceCode: true,
        status: true,
        admissionReview: true,
        paymentStatus: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            studentOf: { select: { name: true, email: true } },
          },
        },
        university: { select: { name: true, code: true } },
        lead: {
          select: {
            stream: { select: { name: true } },
            createdBy: { select: { name: true, email: true } },
          },
        },
      },
    }),
  ]);

  const { page: safePage, totalPages } = paginationMeta(total, page, pageSize);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/dashboard" className="text-sm font-medium text-[var(--primary)] underline underline-offset-2">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">All applications</h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">Cross-university view of student applications.</p>

      <ListQueryToolbar
        className="mt-8"
        total={total}
        page={safePage}
        pageSize={pageSize}
        totalPages={totalPages}
        q={q ?? ""}
        sort={sort}
        sortOptions={SORT_APPLICATIONS}
        searchPlaceholder="Student, reference ID, or university"
        itemLabel="application"
      />

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
            <tr>
              <th className="px-3 py-2">Application ID</th>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Admission partner</th>
              <th className="px-3 py-2">University</th>
              <th className="px-3 py-2">Degree</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Review</th>
              <th className="px-3 py-2">Payment</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-[var(--foreground-muted)]">
                  No applications match your search.
                </td>
              </tr>
            ) : (
              applications.map((a) => (
                <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{a.referenceCode ?? a.id}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{a.user.name ?? "—"}</div>
                    <div className="text-xs text-[var(--foreground-muted)]">{a.user.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{a.lead?.createdBy?.name ?? a.user.studentOf?.name ?? "—"}</div>
                    {a.lead?.createdBy?.email || a.user.studentOf?.email ? (
                      <div className="text-xs text-[var(--foreground-muted)]">
                        {a.lead?.createdBy?.email ?? a.user.studentOf?.email}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{a.university?.name ?? "—"}</td>
                  <td className="px-3 py-2">{a.lead?.stream.name ?? "—"}</td>
                  <td className="px-3 py-2">{a.status}</td>
                  <td className="px-3 py-2">{a.admissionReview}</td>
                  <td className="px-3 py-2">{a.paymentStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
