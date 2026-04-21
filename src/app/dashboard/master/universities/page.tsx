import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";
import { UniversityRowActions } from "@/app/dashboard/master/universities/university-row-actions";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function MasterUniversitiesListPage() {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Universities</h1>
          <p className="mt-2 text-[var(--foreground-muted)]">
            Create and manage university organisations and portal access. Select a university to open admissions for
            that organisation.
          </p>
        </div>
        <Link
          href="/dashboard/master/universities/new"
          className="inline-flex items-center justify-center rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-blue-hover)]"
        >
          Add university
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {universities.map((u) => (
          <article
            key={u.id}
            className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{u.name}</h2>
            <p className="mt-1 font-mono text-xs text-[var(--foreground-muted)]">{u.code}</p>
            <dl className="mt-4 space-y-2 text-sm text-[var(--foreground-muted)]">
              <div className="flex justify-between gap-2">
                <dt>Email</dt>
                <dd className="text-right text-[var(--foreground)]">{u.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Phone</dt>
                <dd className="text-right text-[var(--foreground)]">{u.phone ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Status</dt>
                <dd>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.status === "ACTIVE"
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                        : "bg-[var(--muted)] text-[var(--foreground-muted)]"
                    }`}
                  >
                    {u.status === "ACTIVE" ? "Active" : "Inactive"}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Created</dt>
                <dd className="tabular-nums">{formatDate(u.createdAt)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
              <Link
                href={`/dashboard/university/${u.id}/admissions`}
                className="rounded-lg bg-[var(--accent-blue)] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Admissions
              </Link>
              <Link
                href={`/dashboard/master/universities/${u.id}/edit`}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
              >
                Edit
              </Link>
              <UniversityRowActions universityId={u.id} name={u.name} />
            </div>
          </article>
        ))}
      </div>

      {universities.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">
          No universities yet. Click <strong className="text-[var(--foreground)]">Add university</strong>.
        </p>
      ) : null}
    </div>
  );
}
