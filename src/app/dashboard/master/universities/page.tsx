import { AddUniversityButton } from "@/app/dashboard/master/universities/add-university-button";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { ListQueryToolbar, SORT_UNIVERSITIES } from "@/components/list-controls";
import {
  UniversityEmailIconLink,
  UniversityRowActionsMenu,
} from "@/components/university-row-actions-menu";
import { UniversityNameOpenSlider } from "@/components/university-view-slider";
import { requireAuth } from "@/lib/auth";
import {
  paginationMeta,
  parsePage,
  parsePageSize,
  searchParamOne,
  universityListFilters,
  universityOrderBy,
  universityTextSearchWhere,
} from "@/lib/list-query";
import {
  formatCreatedOn,
  formatProgramStreamsSummary,
  formatTargetCount,
} from "@/lib/university-list-format";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MasterUniversitiesListPage(props: PageProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const sp = await props.searchParams;
  const q = searchParamOne(sp, "q");
  const sort = searchParamOne(sp, "sort") ?? "latest";
  const statusFilter = searchParamOne(sp, "status");
  const programFilter = searchParamOne(sp, "program");
  const stateFilter = searchParamOne(sp, "state");
  const page = parsePage(searchParamOne(sp, "page"));
  const pageSize = parsePageSize(searchParamOne(sp, "pageSize"), 25);

  const textWhere = universityTextSearchWhere(q);
  const filterWhere = universityListFilters({
    status: statusFilter,
    program: programFilter,
    state: stateFilter,
  });
  const where: Prisma.UniversityWhereInput =
    textWhere && filterWhere ? { AND: [textWhere, filterWhere] } : textWhere ?? filterWhere ?? {};

  const [total, universities] = await Promise.all([
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
        status: true,
        createdAt: true,
        targetStudents: true,
        streams: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            name: true,
            degreeType: true,
            programLevel: true,
            totalSeats: true,
          },
        },
        _count: { select: { applications: true } },
      },
    }),
  ]);

  const { page: safePage, totalPages } = paginationMeta(total, page, pageSize);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Universities</h1>
          <AddUniversityButton />
        </div>
        <p className="mt-2 text-[var(--foreground-muted)]">
          Manage university organisations. Use the actions menu on each row to view SPOC details, edit the university,
          change status, or open admissions.
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
        searchPlaceholder="University name, state, code, or email"
        itemLabel="university"
      />

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        {q ? <input type="hidden" name="q" value={q} /> : null}
        {sort !== "latest" ? <input type="hidden" name="sort" value={sort} /> : null}
        <div>
          <label htmlFor="filter-status" className="text-xs font-medium text-[var(--foreground-muted)]">
            Status
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={statusFilter ?? ""}
            className="mt-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-program" className="text-xs font-medium text-[var(--foreground-muted)]">
            Program type
          </label>
          <select
            id="filter-program"
            name="program"
            defaultValue={programFilter ?? ""}
            className="mt-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="UG">UG</option>
            <option value="PG">PG</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-state" className="text-xs font-medium text-[var(--foreground-muted)]">
            State
          </label>
          <input
            id="filter-state"
            name="state"
            defaultValue={stateFilter ?? ""}
            placeholder="State name"
            className="mt-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
        >
          Apply filters
        </button>
      </form>

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
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Contact number</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Email</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Created on</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Status</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Program type and stream(s)</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Target count</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Admissions</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {universities.map((university) => (
                <tr
                  key={university.id}
                  className={`border-b border-[var(--border)] last:border-0 ${
                    university.status === "INACTIVE" ? "bg-[var(--muted)]/30" : ""
                  }`}
                >
                  <td className="px-3 py-3">
                    <UniversityNameOpenSlider
                      universityId={university.id}
                      name={university.name}
                      code={university.code}
                    />
                  </td>
                  <td className="px-3 py-3 tabular-nums">{university.phone ?? "—"}</td>
                  <td className="px-3 py-3">
                    <UniversityEmailIconLink email={university.email} />
                  </td>
                  <td className="px-3 py-3 tabular-nums text-[var(--foreground-muted)]">
                    {formatCreatedOn(university.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        university.status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                          : "bg-[var(--muted)] text-[var(--foreground-muted)]"
                      }`}
                    >
                      {university.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="max-w-[18rem] px-3 py-3 text-[var(--foreground-muted)]">
                    {formatProgramStreamsSummary(university.streams)}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {formatTargetCount(university.targetStudents, university.streams)}
                  </td>
                  <td className="px-3 py-3 tabular-nums">{university._count.applications}</td>
                  <td className="px-3 py-3">
                    <UniversityRowActionsMenu
                      universityId={university.id}
                      name={university.name}
                      status={university.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
