import Link from "next/link";
import { redirect } from "next/navigation";
import { ConsultantInPageUniversitySection } from "@/components/consultant-in-page-university-section";
import { requireAuth } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly, isMaster, isUniversity } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function UniversityHubPage() {
  const session = await requireAuth();

  if (isUniversity(session.roles) && session.universityId) {
    redirect(`/dashboard/university/${session.universityId}/admissions`);
  }

  if (isConsultantOnly(session.roles)) {
    const ids = await getAllowedConsultantUniversityIds(session.sub);
    if (ids.length === 0) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Your universities</h1>
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">
            Your account is not linked to a university yet. Ask a master admin to assign one or more universities, then
            open this page again.
          </p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ConsultantInPageUniversitySection roles={session.roles} variant="hub" />
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
