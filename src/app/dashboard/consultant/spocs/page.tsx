import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { ListQueryToolbar, SORT_USERS } from "@/components/list-controls";
import { requireAuth } from "@/lib/auth";
import {
  paginationMeta,
  parsePage,
  parsePageSize,
  searchParamOne,
  userOrderBy,
  userTextSearchWhere,
} from "@/lib/list-query";
import { prisma } from "@/lib/prisma";
import { canManageSpocs, formatTeamMemberRole, isConsultantOnly, ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConsultantSpocsPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  if (!isConsultantOnly(session.roles) || !canManageSpocs(session.roles)) {
    redirect("/dashboard/consultant-home");
  }

  const sp = await searchParams;
  const q = searchParamOne(sp, "q");
  const sort = searchParamOne(sp, "sort") ?? "email";
  const page = parsePage(searchParamOne(sp, "page"));
  const pageSize = parsePageSize(searchParamOne(sp, "pageSize"), 25);

  const baseWhere: Prisma.UserWhereInput = {
    reportsToConsultantId: session.sub,
    roles: {
      some: { role: { slug: { in: [ROLES.consultantSpoc, ROLES.counsellor] } } },
    },
  };
  const textWhere = userTextSearchWhere(q);
  const where: Prisma.UserWhereInput = textWhere ? { AND: [baseWhere, textWhere] } : baseWhere;

  const [total, spocs] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: userOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        accountStatus: true,
        createdAt: true,
        roles: { include: { role: { select: { slug: true } } } },
        consultantUniversities: {
          include: { university: { select: { name: true, code: true } } },
        },
      },
    }),
  ]);

  const { page: safePage, totalPages } = paginationMeta(total, page, pageSize);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Consultant SPOCs</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--foreground-muted)]">
            Sub-users under your consultant account who can manage leads on assigned universities.
          </p>
        </div>
        <Link
          href="/dashboard/consultant/students"
          className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
        >
          Invite SPOC
        </Link>
      </div>

      <ListQueryToolbar
        className="mt-8"
        total={total}
        page={safePage}
        pageSize={pageSize}
        totalPages={totalPages}
        q={q ?? ""}
        sort={sort}
        sortOptions={SORT_USERS}
        searchPlaceholder="Name, email, or phone"
        itemLabel="SPOC"
      />

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Universities</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {spocs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--foreground-muted)]">
                  {q ? "No SPOCs match your search." : "No SPOCs yet. Invite one from the Students page."}
                </td>
              </tr>
            ) : (
              spocs.map((u) => {
                const uniLabels = u.consultantUniversities.map((c) => `${c.university.name} (${c.university.code})`);
                const roleLabels = u.roles.map((r) => formatTeamMemberRole(r.role.slug)).join(", ");
                return (
                  <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{u.name ?? "—"}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{roleLabels || "—"}</td>
                    <td className="max-w-[14rem] px-4 py-3 text-xs text-[var(--foreground-muted)]">
                      {uniLabels.length > 0 ? uniLabels.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.accountStatus === "ACTIVE"
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                            : "bg-[var(--muted)] text-[var(--foreground-muted)]"
                        }`}
                      >
                        {u.accountStatus === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
