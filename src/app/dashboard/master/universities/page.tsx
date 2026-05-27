import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { ListQueryToolbar, SORT_UNIVERSITIES } from "@/components/list-controls";
import { requireAuth } from "@/lib/auth";
import {
  paginationMeta,
  parsePage,
  parsePageSize,
  searchParamOne,
  universityOrderBy,
  universityTextSearchWhere,
} from "@/lib/list-query";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";
import { UniversityRowActions } from "@/app/dashboard/master/universities/university-row-actions";
import { universityHasDetailsSaved } from "@/lib/university-details-saved";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatFee(value: { toString(): string } | null): string {
  if (value === null) return "—";
  const n = Number(value.toString());
  if (Number.isNaN(n)) return value.toString();
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function MasterUniversitiesListPage(props: PageProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const sp = await props.searchParams;
  const q = searchParamOne(sp, "q");
  const sort = searchParamOne(sp, "sort") ?? "latest";
  const page = parsePage(searchParamOne(sp, "page"));
  const pageSize = parsePageSize(searchParamOne(sp, "pageSize"), 25);

  const textWhere = universityTextSearchWhere(q);
  const where: Prisma.UniversityWhereInput = textWhere ?? {};

  const [total, rows] = await Promise.all([
    prisma.university.count({ where }),
    prisma.university.findMany({
      where,
      orderBy: universityOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        code: true,
        email: true,
        phone: true,
        applicationFee: true,
        logoUrl: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const { page: safePage, totalPages } = paginationMeta(total, page, pageSize);

  const ids = rows.map((r) => r.id);
  const locationById: Record<string, string | null> = {};
  const hostelFeesByUni: Record<string, { amount: unknown }[]> = {};
  const streamsByUni: Record<string, { degreeType: string | null; streamFee: unknown }[]> = {};

  if (ids.length > 0) {
    const locRows = await prisma.$queryRaw<Array<{ id: string; location: string | null }>>(
      Prisma.sql`SELECT id, location FROM "University" WHERE id IN (${Prisma.join(ids)})`
    );
    for (const row of locRows) {
      locationById[row.id] = row.location;
    }

    const streamRows = await prisma.$queryRaw<
      Array<{ universityId: string; degreeType: string | null; streamFee: unknown }>
    >(
      Prisma.sql`SELECT "universityId", "degreeType", "streamFee" FROM "Stream" WHERE "universityId" IN (${Prisma.join(ids)})`
    );
    for (const s of streamRows) {
      if (!streamsByUni[s.universityId]) streamsByUni[s.universityId] = [];
      streamsByUni[s.universityId].push({ degreeType: s.degreeType, streamFee: s.streamFee });
    }

    const hostelRows = await prisma.universityHostelFee.findMany({
      where: { universityId: { in: ids } },
      select: { universityId: true, amount: true },
    });
    for (const h of hostelRows) {
      if (!hostelFeesByUni[h.universityId]) hostelFeesByUni[h.universityId] = [];
      hostelFeesByUni[h.universityId].push({ amount: h.amount });
    }
  }

  const universities = rows.map((u) => ({
    ...u,
    location: locationById[u.id] ?? null,
    hostelFees: hostelFeesByUni[u.id] ?? [],
    streams: streamsByUni[u.id] ?? [],
  }));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Universities</h1>
          <Link
            href="/dashboard/master/universities/new"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-blue-hover)]"
          >
            Add university
          </Link>
        </div>
        <p className="mt-2 text-[var(--foreground-muted)]">
          Create and manage university organisations. Configure academic years (YOP) from each row; programs and admissions live under{" "}
          <strong className="text-[var(--foreground)]">Admissions</strong>.
          <span className="block pt-1">
            <strong className="text-[var(--foreground)]">Deactivate</strong> marks a university inactive (data is kept); use{" "}
            <strong className="text-[var(--foreground)]">Activate</strong> on inactive rows to restore it.
          </span>
        </p>
      </div>

      <ListQueryToolbar
        className="mt-8"
        total={total}
        page={safePage}
        pageSize={pageSize}
        totalPages={totalPages}
        q={q ?? ""}
        sort={sort}
        sortOptions={SORT_UNIVERSITIES}
        searchPlaceholder="University name, code, or email"
        itemLabel="university"
      />

      {universities.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">
          {q ? "No universities match your search." : "No universities yet. Click Add university."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
              <tr>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">University name</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Email</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Phone</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Application fee</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Logo</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Status</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Created</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {universities.map((u) => {
                const detailsSaved = universityHasDetailsSaved(u);
                return (
                <tr
                  key={u.id}
                  className={`border-b border-[var(--border)] last:border-0 ${
                    u.status === "INACTIVE" ? "bg-[var(--muted)]/30" : ""
                  }`}
                >
                  <td className="px-3 py-3">
                    <div className="font-medium text-[var(--foreground)]">{u.name}</div>
                    <div className="font-mono text-xs text-[var(--foreground-muted)]">{u.code}</div>
                  </td>
                  <td className="max-w-[10rem] truncate px-3 py-3" title={u.email ?? ""}>
                    {u.email ?? "—"}
                  </td>
                  <td className="px-3 py-3 tabular-nums">{u.phone ?? "—"}</td>
                  <td className="px-3 py-3 tabular-nums">{formatFee(u.applicationFee)}</td>
                  <td className="px-3 py-3">
                    {u.logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- arbitrary logo URLs */
                      <img
                        src={u.logoUrl}
                        alt=""
                        className="h-10 w-10 rounded-md border border-[var(--border)] object-contain"
                      />
                    ) : (
                      <span className="text-[var(--foreground-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                          : "bg-[var(--muted)] text-[var(--foreground-muted)]"
                      }`}
                    >
                      {u.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-3 tabular-nums text-[var(--foreground-muted)]">{formatDate(u.createdAt)}</td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex max-w-[14rem] flex-col gap-1.5">
                      <Link
                        href={`/dashboard/university/${u.id}/admissions/academic-years`}
                        className="text-[var(--primary)] underline-offset-2 hover:underline"
                      >
                        Add YOP
                      </Link>
                      <Link
                        href={`/dashboard/master/universities/${u.id}/details`}
                        className="inline-flex w-fit items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
                      >
                        {detailsSaved ? "View/Edit university details" : "Add university details"}
                      </Link>
                      <Link
                        href={`/dashboard/master/universities/${u.id}/edit`}
                        className="text-[var(--primary)] underline-offset-2 hover:underline"
                      >
                        Edit
                      </Link>
                      <UniversityRowActions universityId={u.id} name={u.name} status={u.status} />
                      <Link
                        href={`/dashboard/university/${u.id}/admissions`}
                        className="text-[var(--primary)] underline-offset-2 hover:underline"
                      >
                        Admissions
                      </Link>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
