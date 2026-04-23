import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/dashboard-data";
import { PortalWorkflowMap } from "@/components/portal-workflow-map";
import {
  canAccessLeadsAndBatches,
  isConsultantOnly,
  isMaster,
  isStudent,
  isUniversity,
  formatRoleLabel,
} from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth();
  if (isConsultantOnly(session.roles)) {
    redirect("/dashboard/university");
  }
  const data = await getDashboardSnapshot(session);

  if (data.setupMessage) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">Dashboard</h1>
        <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[var(--foreground)]">
          {data.setupMessage}
        </p>
      </div>
    );
  }

  const roleLine = session.roles.length ? session.roles.map(formatRoleLabel).join(", ") : "none";
  const masterView = isMaster(session.roles) && !isStudent(session.roles);
  const consultantTeam = isConsultantOnly(session.roles);
  const universityStaff = isUniversity(session.roles) && !isMaster(session.roles);

  const staffWorkflowKind =
    masterView ? ("master" as const)
    : universityStaff && session.universityId ? ("university" as const)
    : consultantTeam ? ("consultant" as const)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--foreground)]">
            {masterView ? "Network overview" : `Hello, ${data.greetingName}`}
          </h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">{data.email}</p>
        </div>
        <p className="text-sm text-[var(--foreground-muted)]">
          {masterView ? (
            <span className="font-medium text-[var(--foreground)]">Master administrator</span>
          ) : (
            <>
              Roles: <span className="font-medium text-[var(--foreground)]">{roleLine}</span>
            </>
          )}
        </p>
      </div>

      {masterView ? (
        <p className="mt-3 max-w-3xl text-sm text-[var(--foreground-muted)]">
          Universities on the platform, with admission partner and student counts. Use{" "}
          <strong className="text-[var(--foreground)]">Manage users</strong> in the consultant workspace to invite
          students and open the full directory.
        </p>
      ) : null}

      {data.university && !isStudent(session.roles) && !masterView ? (
        <p className="mt-4 text-sm text-[var(--foreground-muted)]">
          Organisation:{" "}
          <strong className="text-[var(--foreground)]">
            {data.university.name} ({data.university.code})
          </strong>
        </p>
      ) : null}

      {consultantTeam ? (
        <p className="mt-3 max-w-2xl text-sm text-[var(--foreground-muted)]">
          Your workspace covers <strong className="text-[var(--foreground)]">students you add and manage</strong>. Use
          the Students area to send invites and keep track of invitations.
        </p>
      ) : null}

      {isStudent(session.roles) && !isMaster(session.roles) && data.studentPortalJourney ? (
        <div className="mt-8">
          <PortalWorkflowMap mode="student" journey={data.studentPortalJourney} />
        </div>
      ) : null}

      {!isStudent(session.roles) && staffWorkflowKind ? (
        <div className="mt-8">
          <PortalWorkflowMap mode="staff" staffKind={staffWorkflowKind} />
        </div>
      ) : null}

      {isStudent(session.roles) && !isMaster(session.roles) && data.studentSelf ? (
        <div className="mt-8 flex min-h-[min(70vh,40rem)] flex-col space-y-6">
          {data.studentSelf.universityLogoUrl ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                University logo
              </p>
              <div className="mt-4 flex justify-center sm:justify-start">
                {/* Arbitrary HTTPS logo URLs from master admin — avoid next/image remote config */}
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote logo URLs */}
                <img
                  src={data.studentSelf.universityLogoUrl}
                  alt={data.studentSelf.universityName ?? "University logo"}
                  className="max-h-28 max-w-full object-contain"
                />
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {data.stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                  {s.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{s.value}</p>
                {s.sub ? <p className="mt-1 text-xs text-[var(--foreground-muted)]">{s.sub}</p> : null}
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/student/application"
            className="inline-flex rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[var(--accent-blue-hover)]"
          >
            Open student portal
          </Link>
        </div>
      ) : (
        <>
          {data.stats.length > 0 ? (
            <div
              className={`mt-8 grid gap-4 ${
                masterView ? "sm:grid-cols-2 lg:grid-cols-4" : consultantTeam ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {data.stats.map((s) => {
                const inner = (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                      {s.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">{s.value}</p>
                    {s.sub ? (
                      <p className="mt-1 text-xs text-[var(--foreground-muted)]">{s.sub}</p>
                    ) : null}
                  </>
                );
                if (s.href) {
                  return (
                    <Link
                      key={s.label}
                      href={s.href}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-[var(--primary)]/40"
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <div
                    key={s.label}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
          ) : null}

          {masterView ? (
            <section className="mt-10" aria-labelledby="uni-table-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="uni-table-title" className="text-lg font-semibold text-[var(--foreground)]">
                    Universities
                  </h2>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                    Admission partners and students linked to each organisation.
                  </p>
                </div>
                <Link
                  href="/dashboard/master/universities"
                  className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                >
                  Manage universities
                </Link>
              </div>
              {data.masterUniversities && data.masterUniversities.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground-muted)]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">University</th>
                        <th className="px-4 py-3 font-semibold">Code</th>
                        <th className="px-4 py-3 font-semibold">Admission partners</th>
                        <th className="px-4 py-3 font-semibold">Students</th>
                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.masterUniversities.map((u) => (
                        <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                          <td className="px-4 py-3 font-medium text-[var(--foreground)]">{u.name}</td>
                          <td className="px-4 py-3 text-[var(--foreground-muted)]">{u.code}</td>
                          <td className="px-4 py-3 tabular-nums text-[var(--foreground-muted)]">{u.consultantCount}</td>
                          <td className="px-4 py-3 tabular-nums text-[var(--foreground-muted)]">{u.studentCount}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                              <Link
                                href={`/dashboard/master/universities/${u.id}/edit`}
                                className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                              >
                                Edit
                              </Link>
                              <Link
                                href={`/dashboard/university/${u.id}/admissions`}
                                className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                              >
                                Admissions
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">
                  No universities yet. Add records or run the seed script.
                </p>
              )}
            </section>
          ) : null}

          {canAccessLeadsAndBatches(session.roles) && data.recentStudents.length > 0 && !universityStaff ? (
            <div className="mt-10">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent students</h2>
                <Link
                  href="/dashboard/consultant/students"
                  className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                >
                  Manage users
                </Link>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground-muted)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Invitation</th>
                      <th className="px-4 py-3 text-right font-semibold"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentStudents.map((row) => (
                      <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">{row.name ?? "—"}</td>
                        <td className="px-4 py-3 text-[var(--foreground-muted)]">{row.email}</td>
                        <td className="px-4 py-3">
                          {row.pendingInvite ? (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                              Pending
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                              Accepted
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboard/consultant/students/${row.id}`}
                            className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {consultantTeam ? (
            <div className="mt-10">
              <Link
                href="/dashboard/consultant/students"
                className="flex flex-col rounded-2xl border border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/10 p-6 shadow-sm transition hover:border-[var(--accent-blue)]/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-base font-semibold text-[var(--foreground)]">Manage users</p>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                    Invite new users by email and manage everyone on your roster.
                  </p>
                </div>
                <span className="mt-4 inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white sm:mt-0">
                  Go to Manage users
                </span>
              </Link>
            </div>
          ) : null}

          {universityStaff && session.universityId ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Link
                href={`/dashboard/university/${session.universityId}/admissions`}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-[var(--primary)]/40"
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">Admissions & leads</p>
                <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                  Consultants, academic years, streams, and lead list.
                </p>
              </Link>
              <Link
                href="/dashboard/batches"
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-[var(--primary)]/40"
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">Leads / batches</p>
                <p className="mt-1 text-sm text-[var(--foreground-muted)]">Operational workflows.</p>
              </Link>
              <Link
                href="/dashboard/applications"
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-[var(--primary)]/40"
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">Applications</p>
                <p className="mt-1 text-sm text-[var(--foreground-muted)]">Pipeline metrics and overview.</p>
              </Link>
            </div>
          ) : null}
        </>
      )}

      {!isStudent(session.roles) && !masterView && !consultantTeam ? (
        <div className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--foreground)]">Roles</p>
          <ul className="mt-3 list-inside list-disc text-sm text-[var(--foreground-muted)]">
            <li>
              <strong className="text-[var(--foreground)]">University</strong> — admission partners and org-wide tools
            </li>
            <li>
              <strong className="text-[var(--foreground)]">Student</strong> — personal application journey
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
