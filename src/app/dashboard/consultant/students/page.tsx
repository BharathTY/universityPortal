import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import {
  canAccessLeadsAndBatches,
  isConsultant,
  isConsultantOnly,
  isMaster,
  isUniversity,
  ROLES,
  formatTeamMemberRole,
} from "@/lib/roles";
import { InviteStudentForm } from "@/app/dashboard/consultant/students/invite-student-form";

const PARTNER_ROSTER_SLUGS = [
  ROLES.consultant,
  ROLES.counsellor,
  ROLES.consultantMaster,
  ROLES.qspidersBranch,
] as const;

export default async function ConsultantStudentsPage() {
  const session = await requireAuth();
  if (!canAccessLeadsAndBatches(session.roles)) {
    redirect("/dashboard");
  }

  const studentWhere: Prisma.UserWhereInput = {
    roles: { some: { role: { slug: ROLES.student } } },
  };

  if (isConsultant(session.roles) && !isMaster(session.roles) && !isUniversity(session.roles)) {
    studentWhere.studentOfId = session.sub;
  } else if (isUniversity(session.roles) && session.universityId) {
    studentWhere.universityId = session.universityId;
  }

  const students = await prisma.user.findMany({
    where: studentWhere,
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      inviteToken: true,
      inviteAcceptedAt: true,
      university: { select: { name: true, code: true } },
      studentOf: { select: { email: true } },
    },
    take: 100,
  });

  const canInvite = isConsultant(session.roles);

  let teamMembers: Awaited<ReturnType<typeof loadTeamMembers>> = [];
  if (isConsultantOnly(session.roles)) {
    teamMembers = await loadTeamMembers(session.sub);
  }

  const title =
    isConsultantOnly(session.roles)
      ? "Team"
      : isMaster(session.roles) || isUniversity(session.roles)
        ? "Students (scoped to your access)"
        : "Your students";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">{title}</h1>
      <p className="mt-2 max-w-3xl text-[var(--foreground-muted)]">
        {isConsultantOnly(session.roles) ? (
          <>
            Manage <strong className="text-[var(--foreground)]">team members</strong> (counsellors, managers, partners)
            and <strong className="text-[var(--foreground)]">students</strong> you support. Invite students by email;
            they must accept before OTP login.
          </>
        ) : (
          <>
            <strong className="text-[var(--foreground)]">Counsellors and consultants</strong> can add students: we send
            an email with an acceptance link. After the student accepts, they can use the normal OTP login. University
            and master roles see broader lists here.
          </>
        )}
      </p>

      {isConsultantOnly(session.roles) ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Invite student</h2>
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">
              Adds a student linked to your organisation; they receive an accept link, then OTP login.
            </p>
            <div className="mt-4">{canInvite ? <InviteStudentForm /> : null}</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Counsellor & manager</h2>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              Staff accounts for <strong className="text-[var(--foreground)]">counsellor</strong>,{" "}
              <strong className="text-[var(--foreground)]">manager</strong>, and{" "}
              <strong className="text-[var(--foreground)]">branch</strong> partners are created by your{" "}
              <strong className="text-[var(--foreground)]">master administrator</strong> under{" "}
              <strong className="text-[var(--foreground)]">Master → Admission partners</strong>. Contact them to add or
              change team access.
            </p>
          </div>
        </div>
      ) : (
        canInvite && (
          <div className="mt-8">
            <InviteStudentForm />
          </div>
        )
      )}

      {isConsultantOnly(session.roles) ? (
        <>
          <h2 className="mt-12 text-lg font-semibold text-[var(--foreground)]">Team members</h2>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Counsellors, managers, and admission partners who share at least one of your assigned universities (not your
            own row).
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Branch</th>
                  <th className="px-4 py-3 font-semibold">Universities</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{m.name ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{m.email}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{roleSummary(m.roles)}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{m.branchName ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{uniSummary(m)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.accountStatus === "ACTIVE"
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                            : "bg-[var(--muted)] text-[var(--foreground-muted)]"
                        }`}
                      >
                        {m.accountStatus === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {teamMembers.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">
                No other team members share your universities yet.
              </p>
            ) : null}
          </div>

          <h2 className="mt-12 text-lg font-semibold text-[var(--foreground)]">Students you manage</h2>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Use <strong className="text-[var(--foreground)]">View</strong> and{" "}
            <strong className="text-[var(--foreground)]">Edit</strong> on each row for details.
          </p>
        </>
      ) : null}

      <div
        className={
          isConsultantOnly(session.roles) ? "mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm" : "mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
        }
      >
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Invitation</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">University</th>
              <th className="px-4 py-3 font-semibold">Admission partner</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-medium text-[var(--foreground)]">{s.email}</td>
                <td className="px-4 py-3 text-[var(--foreground-muted)]">{s.name ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--foreground-muted)]">
                  {s.inviteToken ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                      Pending
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                      Accepted
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--foreground-muted)]">
                  {s.inviteToken ? (
                    <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      Invited
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--foreground-muted)]">
                  {s.university ? `${s.university.name} (${s.university.code})` : "—"}
                </td>
                <td className="px-4 py-3 text-[var(--foreground-muted)]">{s.studentOf?.email ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Link
                      href={`/dashboard/consultant/students/${s.id}`}
                      className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                    >
                      View
                    </Link>
                    <span className="text-[var(--foreground-muted)]" aria-hidden>
                      ·
                    </span>
                    <Link
                      href={`/dashboard/consultant/students/${s.id}/edit`}
                      className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">No student users found.</p>
        ) : null}
      </div>
    </div>
  );
}

function roleSummary(roles: { role: { slug: string } }[]): string {
  const slugs = [...new Set(roles.map((r) => r.role.slug))].filter((s) =>
    (PARTNER_ROSTER_SLUGS as readonly string[]).includes(s),
  );
  if (slugs.length === 0) return "—";
  return slugs.map((s) => formatTeamMemberRole(s)).join(", ");
}

function uniSummary(m: {
  university: { name: string; code: string } | null;
  consultantUniversities: { university: { name: string; code: string } }[];
}): string {
  const fromJoin = m.consultantUniversities.map((c) => `${c.university.name} (${c.university.code})`);
  if (fromJoin.length > 0) return fromJoin.join(", ");
  if (m.university) return `${m.university.name} (${m.university.code})`;
  return "—";
}

async function loadTeamMembers(currentUserId: string) {
  const myUniIds = await getAllowedConsultantUniversityIds(currentUserId);
  if (myUniIds.length === 0) return [];

  return prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      OR: [
        { consultantUniversities: { some: { universityId: { in: myUniIds } } } },
        { universityId: { in: myUniIds } },
      ],
      roles: { some: { role: { slug: { in: [...PARTNER_ROSTER_SLUGS] } } } },
    },
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      branchName: true,
      accountStatus: true,
      university: { select: { name: true, code: true } },
      roles: { include: { role: { select: { slug: true } } } },
      consultantUniversities: {
        include: { university: { select: { name: true, code: true } } },
      },
    },
    take: 100,
  });
}
