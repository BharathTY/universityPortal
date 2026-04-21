import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { ADMISSION_PARTNER_ROLE_SLUGS } from "@/lib/admission-partner-slugs";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";
import { ConsultantRowActions } from "@/app/dashboard/master/consultants/consultant-row-actions";

export const dynamic = "force-dynamic";

export default async function MasterConsultantsListPage() {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const consultants = await prisma.user.findMany({
    where: {
      roles: { some: { role: { slug: { in: [...ADMISSION_PARTNER_ROLE_SLUGS] } } } },
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
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Admission partners</h1>
          <p className="mt-2 text-[var(--foreground-muted)]">
            Consultant, counsellor, branch, and partner accounts across all universities. Open admissions to see each
            partner&apos;s pipeline with university names.
          </p>
        </div>
        <Link
          href="/dashboard/master/consultants/new"
          className="inline-flex items-center justify-center rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-blue-hover)]"
        >
          Add admission partner
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {consultants.map((u) => (
          <article
            key={u.id}
            className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{u.name ?? "—"}</h2>
            <p className="mt-1 break-all text-sm text-[var(--foreground-muted)]">{u.email}</p>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">{u.phone ?? "—"}</p>
            {u.branchName ? (
              <p className="mt-2 text-sm">
                <span className="text-[var(--foreground-muted)]">Branch: </span>
                <span className="font-medium text-[var(--foreground)]">{u.branchName}</span>
              </p>
            ) : null}
            <div className="mt-3 text-sm leading-relaxed text-[var(--foreground-muted)]">
              <span className="font-medium text-[var(--foreground)]">Universities: </span>
              {u.consultantUniversities.length > 0 ? (
                [...u.consultantUniversities]
                  .sort((a, b) => a.university.name.localeCompare(b.university.name))
                  .map((c, i) => (
                    <span key={c.universityId}>
                      {i > 0 ? ", " : null}
                      {c.university.name}{" "}
                      <span className="text-xs text-[var(--foreground-muted)]">({c.university.code})</span>
                    </span>
                  ))
              ) : u.university ? (
                <span>
                  {u.university.name}{" "}
                  <span className="text-xs text-[var(--foreground-muted)]">({u.university.code})</span>
                </span>
              ) : (
                "—"
              )}
            </div>
            <p className="mt-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  u.accountStatus === "ACTIVE"
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                    : "bg-[var(--muted)] text-[var(--foreground-muted)]"
                }`}
              >
                {u.accountStatus === "ACTIVE" ? "Active" : "Inactive"}
              </span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
              <Link
                href={`/dashboard/master/consultants/${u.id}/admissions`}
                className="rounded-lg bg-[var(--accent-blue)] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Admissions
              </Link>
              <Link
                href={`/dashboard/master/consultants/${u.id}/edit`}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
              >
                Edit
              </Link>
              <ConsultantRowActions userId={u.id} email={u.email} />
            </div>
          </article>
        ))}
      </div>

      {consultants.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">
          No admission partners yet. Click <strong className="text-[var(--foreground)]">Add admission partner</strong>.
        </p>
      ) : null}
    </div>
  );
}
