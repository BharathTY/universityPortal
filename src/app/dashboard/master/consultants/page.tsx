import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMaster, ROLES } from "@/lib/roles";
import { ConsultantRowActions } from "@/app/dashboard/master/consultants/consultant-row-actions";

export const dynamic = "force-dynamic";

const consultantSlugs = [ROLES.consultant, ROLES.counsellor, ROLES.consultantMaster] as const;

export default async function MasterConsultantsListPage() {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const consultants = await prisma.user.findMany({
    where: {
      roles: { some: { role: { slug: { in: [...consultantSlugs] } } } },
    },
    orderBy: { email: "asc" },
    include: {
      university: { select: { id: true, name: true, code: true } },
      consultantUniversities: {
        include: { university: { select: { id: true, name: true, code: true } } },
      },
      roles: { include: { role: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Consultants</h1>
          <p className="mt-2 text-[var(--foreground-muted)]">
            Consultant and counsellor accounts across all universities.
          </p>
        </div>
        <Link
          href="/dashboard/master/consultants/new"
          className="inline-flex items-center justify-center rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-blue-hover)]"
        >
          Add consultant
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Universities</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {consultants.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--foreground-muted)]">{u.email}</td>
                  <td className="px-4 py-3 text-[var(--foreground-muted)]">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--foreground-muted)]">
                    {u.consultantUniversities.length > 0 ? (
                      <span className="leading-relaxed">
                        {[...u.consultantUniversities]
                          .sort((a, b) => a.university.name.localeCompare(b.university.name))
                          .map((c, i) => (
                          <span key={c.universityId}>
                            {i > 0 ? ", " : null}
                            {c.university.name}{" "}
                            <span className="text-xs text-[var(--foreground-muted)]">({c.university.code})</span>
                          </span>
                        ))}
                      </span>
                    ) : u.university ? (
                      <span>
                        {u.university.name}{" "}
                        <span className="text-xs text-[var(--foreground-muted)]">({u.university.code})</span>
                      </span>
                    ) : (
                      "—"
                    )}
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
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/master/consultants/${u.id}/edit`}
                        className="text-sm font-medium text-[var(--primary)] hover:underline"
                      >
                        Edit
                      </Link>
                      <ConsultantRowActions userId={u.id} email={u.email} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {consultants.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">
            No consultants yet. Click <strong className="text-[var(--foreground)]">Add consultant</strong>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
