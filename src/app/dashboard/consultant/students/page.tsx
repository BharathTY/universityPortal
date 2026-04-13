import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canAccessLeadsAndBatches,
  isConsultant,
  isConsultantOnly,
  isMaster,
  isUniversity,
  ROLES,
} from "@/lib/roles";
import { InviteStudentForm } from "@/app/dashboard/consultant/students/invite-student-form";

export default async function ConsultantStudentsPage() {
  const session = await requireAuth();
  if (!canAccessLeadsAndBatches(session.roles)) {
    redirect("/dashboard");
  }

  const where: Prisma.UserWhereInput = {
    roles: { some: { role: { slug: ROLES.student } } },
  };

  if (isConsultant(session.roles) && !isMaster(session.roles) && !isUniversity(session.roles)) {
    where.studentOfId = session.sub;
  } else if (isUniversity(session.roles) && session.universityId) {
    where.universityId = session.universityId;
  }

  const students = await prisma.user.findMany({
    where,
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

  const title =
    isMaster(session.roles) || isUniversity(session.roles)
      ? "Students (scoped to your access)"
      : isConsultantOnly(session.roles)
        ? "Students"
        : "Your students";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">{title}</h1>
      <p className="mt-2 max-w-3xl text-[var(--foreground-muted)]">
        {isConsultantOnly(session.roles) ? (
          <>
            Invite students by email; they must accept before OTP login. Use <strong className="text-[var(--foreground)]">View</strong>{" "}
            and <strong className="text-[var(--foreground)]">Edit</strong> on each row for details.
          </>
        ) : (
          <>
            <strong className="text-[var(--foreground)]">Counsellors and consultants</strong> can add students: we send
            an email with an acceptance link. After the student accepts, they can use the normal OTP login. University
            and master roles see broader lists here.
          </>
        )}
      </p>

      {canInvite ? (
        <div className="mt-8">
          <InviteStudentForm />
        </div>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Invitation</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">University</th>
              <th className="px-4 py-3 font-semibold">Counsellor / consultant</th>
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
