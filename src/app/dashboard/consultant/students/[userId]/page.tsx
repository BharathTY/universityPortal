import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canAccessLeadsAndBatches, formatRoleLabel } from "@/lib/roles";
import { getManagedStudentOrNull } from "@/lib/managed-student-access";

type PageProps = { params: Promise<{ userId: string }> };

export default async function ManagedStudentViewPage(props: PageProps) {
  const session = await requireAuth();
  if (!canAccessLeadsAndBatches(session.roles)) {
    redirect("/dashboard");
  }

  const { userId } = await props.params;
  const user = await getManagedStudentOrNull(userId, session);
  if (!user) notFound();

  const roleLabels = user.roles.map((r) => formatRoleLabel(r.role.slug)).join(", ");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/dashboard/consultant/students"
          className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
        >
          ← Manage users
        </Link>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">View user</h1>
          <p className="mt-1 text-[var(--foreground-muted)]">Student profile and invitation status.</p>
        </div>
        <Link
          href={`/dashboard/consultant/students/${user.id}/edit`}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]/50"
        >
          Edit
        </Link>
      </div>

      <dl className="mt-8 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium text-[var(--foreground-muted)]">User display name</dt>
          <dd className="text-sm text-[var(--foreground)] sm:col-span-2">{user.name ?? "—"}</dd>
        </div>
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium text-[var(--foreground-muted)]">Contact email</dt>
          <dd className="text-sm text-[var(--foreground)] sm:col-span-2">{user.email}</dd>
        </div>
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium text-[var(--foreground-muted)]">Role</dt>
          <dd className="text-sm text-[var(--foreground)] sm:col-span-2">{roleLabels || "—"}</dd>
        </div>
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium text-[var(--foreground-muted)]">Invitation</dt>
          <dd className="sm:col-span-2">
            {user.inviteToken ? (
              <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                Pending
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                Accepted
              </span>
            )}
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium text-[var(--foreground-muted)]">Status</dt>
          <dd className="sm:col-span-2">
            {user.inviteToken ? (
              <span className="inline-flex rounded-full bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                Invited
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                Active
              </span>
            )}
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium text-[var(--foreground-muted)]">University</dt>
          <dd className="text-sm text-[var(--foreground)] sm:col-span-2">
            {user.university ? `${user.university.name} (${user.university.code})` : "—"}
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium text-[var(--foreground-muted)]">Counsellor / consultant</dt>
          <dd className="text-sm text-[var(--foreground)] sm:col-span-2">
            {user.studentOf ? (
              <>
                {user.studentOf.name ? `${user.studentOf.name} · ` : null}
                {user.studentOf.email}
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
