import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { ListQueryToolbar, SORT_USERS } from "@/components/list-controls";
import { requireAuth } from "@/lib/auth";
import { ADMISSION_PARTNER_ROLE_SLUGS } from "@/lib/admission-partner-slugs";
import {
  paginationMeta,
  parsePage,
  parsePageSize,
  searchParamOne,
  userOrderBy,
  userTextSearchWhere,
} from "@/lib/list-query";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";
import { ConsultantRowActions } from "@/app/dashboard/master/consultants/consultant-row-actions";

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

export default async function MasterConsultantsListPage(props: PageProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const sp = await props.searchParams;
  const q = searchParamOne(sp, "q");
  const sort = searchParamOne(sp, "sort") ?? "latest";
  const page = parsePage(searchParamOne(sp, "page"));
  const pageSize = parsePageSize(searchParamOne(sp, "pageSize"), 25);

  const baseWhere: Prisma.UserWhereInput = {
    roles: { some: { role: { slug: { in: [...ADMISSION_PARTNER_ROLE_SLUGS] } } } },
  };
  const textWhere = userTextSearchWhere(q);
  const where: Prisma.UserWhereInput = textWhere ? { AND: [baseWhere, textWhere] } : baseWhere;

  const [total, consultants] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: userOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        university: { select: { id: true, name: true, code: true } },
        consultantUniversities: {
          include: { university: { select: { id: true, name: true, code: true } } },
        },
        roles: { include: { role: true } },
      },
    }),
  ]);

  const { page: safePage, totalPages } = paginationMeta(total, page, pageSize);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Consultants</h1>
          <p className="mt-2 text-[var(--foreground-muted)]">
            Admission partners: create accounts, assign universities, and send login details by email.
            <span className="block pt-1">
              <strong className="text-[var(--foreground)]">Deactivate</strong> blocks sign-in (data kept); use{" "}
              <strong className="text-[var(--foreground)]">Activate</strong> on inactive rows to restore access.
            </span>
          </p>
        </div>
        <Link
          href="/dashboard/master/consultants/new"
          className="inline-flex items-center justify-center rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-blue-hover)]"
        >
          Add consultant
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
        searchPlaceholder="Name, email, phone, or company"
        itemLabel="consultant"
      />

      {consultants.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">
          {q ? "No consultants match your search." : "No consultants yet. Click Add consultant."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
              <tr>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Consultant name</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Company</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Email</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Phone</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Assigned universities</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Status</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Created</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {consultants.map((u) => {
                const uniLabels =
                  u.consultantUniversities.length > 0
                    ? [...u.consultantUniversities]
                        .sort((a, b) => a.university.name.localeCompare(b.university.name))
                        .map((c) => `${c.university.name} (${c.university.code})`)
                    : u.university
                      ? [`${u.university.name} (${u.university.code})`]
                      : [];
                const primaryUni = uniLabels[0] ?? null;
                const extraUniCount = uniLabels.length > 1 ? uniLabels.length - 1 : 0;
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-[var(--border)] last:border-0 ${
                      u.accountStatus === "INACTIVE" ? "bg-[var(--muted)]/30" : ""
                    }`}
                  >
                    <td className="px-3 py-3 font-medium text-[var(--foreground)]">{u.name ?? "—"}</td>
                    <td className="max-w-[10rem] truncate px-3 py-3 text-[var(--foreground-muted)]" title={u.companyName ?? undefined}>
                      {u.companyName?.trim() || "—"}
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-3" title={u.email}>
                      {u.email}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{u.phone ?? "—"}</td>
                    <td className="max-w-[16rem] px-3 py-3 text-[var(--foreground-muted)]">
                      {primaryUni ? (
                        <span title={uniLabels.join("\n")}>
                          {primaryUni}
                          {extraUniCount > 0 ? (
                            <span className="ml-1 rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs font-medium text-[var(--foreground)]">
                              +{extraUniCount}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3">
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
                    <td className="px-3 py-3 tabular-nums text-[var(--foreground-muted)]">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-1.5">
                        <Link
                          href={`/dashboard/master/consultants/${u.id}/admissions`}
                          className="text-[var(--primary)] underline-offset-2 hover:underline"
                        >
                          View leads
                        </Link>
                        <Link
                          href={`/dashboard/master/consultants/${u.id}/edit`}
                          className="text-[var(--primary)] underline-offset-2 hover:underline"
                        >
                          Edit
                        </Link>
                        <ConsultantRowActions
                          userId={u.id}
                          name={u.name}
                          email={u.email}
                          accountStatus={u.accountStatus}
                        />
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
