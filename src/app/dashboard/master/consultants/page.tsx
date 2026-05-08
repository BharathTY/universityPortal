import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { ADMISSION_PARTNER_ROLE_SLUGS } from "@/lib/admission-partner-slugs";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";
import { ConsultantRowActions } from "@/app/dashboard/master/consultants/consultant-row-actions";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function MasterConsultantsListPage() {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const consultants = await prisma.user.findMany({
    where: {
      roles: { some: { role: { slug: { in: [...ADMISSION_PARTNER_ROLE_SLUGS] } } } },
    },
    orderBy: { createdAt: "desc" },
    include: {
      university: { select: { id: true, name: true, code: true } },
      consultantUniversities: {
        include: { university: { select: { id: true, name: true, code: true } } },
      },
      roles: { include: { role: true } },
    },
  });

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Consultants</h1>
          <p className="mt-2 text-[var(--foreground-muted)]">
            Admission partners: create accounts, assign universities, and send login details by email.
          </p>
        </div>
        <Link
          href="/dashboard/master/consultants/new"
          className="inline-flex items-center justify-center rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-blue-hover)]"
        >
          Add consultant
        </Link>
      </div>

      {consultants.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">
          No consultants yet. Click <strong className="text-[var(--foreground)]">Add consultant</strong>.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
              <tr>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Consultant name</th>
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
                return (
                  <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-3 font-medium text-[var(--foreground)]">{u.name ?? "—"}</td>
                    <td className="max-w-[12rem] truncate px-3 py-3" title={u.email}>
                      {u.email}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{u.phone ?? "—"}</td>
                    <td className="max-w-[20rem] px-3 py-3 text-[var(--foreground-muted)]">
                      {uniLabels.length ? uniLabels.join("; ") : "—"}
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
                        <ConsultantRowActions userId={u.id} email={u.email} />
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
