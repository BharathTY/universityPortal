import Link from "next/link";
import { redirect } from "next/navigation";
import { ConsultantUniversityHubClient } from "@/app/dashboard/university/consultant-university-hub-client";
import { requireAuth } from "@/lib/auth";
import {
  getAllowedConsultantUniversityIds,
  getConsultantAssignedUniversitiesForDisplay,
  resolveConsultantActiveUniversityId,
} from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly, isCounsellorOnly, isMaster, isUniversity } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function UniversityHubPage() {
  const session = await requireAuth();

  if (isUniversity(session.roles) && session.universityId) {
    redirect(`/dashboard/university/${session.universityId}/admissions`);
  }

  if (isConsultantOnly(session.roles)) {
    const [assignedUnis, activeIds] = await Promise.all([
      getConsultantAssignedUniversitiesForDisplay(session.sub),
      getAllowedConsultantUniversityIds(session.sub),
    ]);

    if (assignedUnis.length === 0) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Your universities</h1>
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">
            You have no university assignments yet. Ask a master administrator to assign you to one or more
            organisations under <strong className="text-[var(--foreground)]">Master → Admission partners</strong>.
          </p>
        </div>
      );
    }

    if (activeIds.length === 0) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Your universities</h1>
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">
            You are linked to the organisations below, but each one is currently <strong>inactive</strong>. Ask a master
            administrator to reactivate them before you can manage leads and admissions.
          </p>
          <ul className="mt-6 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            {assignedUnis.map((u) => (
              <li key={u.id} className="text-sm text-[var(--foreground)]">
                <span className="font-semibold">{u.name}</span>{" "}
                <span className="text-[var(--foreground-muted)]">({u.code})</span>{" "}
                <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--foreground-muted)]">
                  Inactive
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    const { universityId } = await resolveConsultantActiveUniversityId(session);
    if (!universityId) {
      redirect("/dashboard");
    }
    const [university, streams, academicYears] = await Promise.all([
      prisma.university.findFirst({
        where: { id: universityId, status: "ACTIVE" },
        select: { id: true, name: true, code: true },
      }),
      prisma.stream.findMany({
        where: { universityId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
      prisma.academicYear.findMany({
        where: { universityId },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        select: { id: true, label: true },
      }),
    ]);

    if (!university) {
      redirect("/dashboard");
    }

    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ConsultantUniversityHubClient
          initial={{
            universityId: university.id,
            universityName: university.name,
            universityCode: university.code,
            streams,
            academicYears,
            universities: assignedUnis,
            viewOnlyUniversityDetails: isCounsellorOnly(session.roles),
          }}
        />
      </div>
    );
  }

  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Universities & admissions</h1>
      <p className="mt-2 text-[var(--foreground-muted)]">
        Pick a university to open admissions, consultants, and leads (Master access).
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {universities.map((u) => (
          <li key={u.id}>
            <Link
              href={`/dashboard/university/${u.id}/admissions`}
              className="block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-[var(--primary)]/40"
            >
              <p className="font-semibold text-[var(--foreground)]">{u.name}</p>
              <p className="text-sm text-[var(--foreground-muted)]">{u.code}</p>
              <p className="mt-2 text-xs text-[var(--foreground-muted)]">{u._count.users} portal users</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
