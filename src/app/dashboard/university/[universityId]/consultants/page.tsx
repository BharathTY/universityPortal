import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRoleLabel, isMaster, isUniversity, ROLES } from "@/lib/roles";

type PageProps = { params: Promise<{ universityId: string }> };

export default async function UniversityConsultantsPage(props: PageProps) {
  const session = await requireAuth();
  const { universityId } = await props.params;

  if (isUniversity(session.roles)) {
    if (!session.universityId || session.universityId !== universityId) {
      redirect("/dashboard");
    }
  } else if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const university = await prisma.university.findUnique({
    where: { id: universityId },
  });
  if (!university) notFound();

  const consultantSlugs = [ROLES.consultant, ROLES.counsellor, ROLES.consultantMaster, ROLES.qspidersBranch];

  const consultants = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: { slug: { in: consultantSlugs } },
        },
      },
      OR: [
        { universityId },
        { consultantUniversities: { some: { universityId } } },
      ],
    },
    orderBy: { email: "asc" },
    include: {
      roles: { include: { role: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Admission partners</h1>
      <p className="mt-2 text-[var(--foreground-muted)]">
        {university.name} <span className="text-[var(--foreground)]">({university.code})</span> — partners who can work
        leads and students for this university.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Roles</th>
            </tr>
          </thead>
          <tbody>
            {consultants.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-medium text-[var(--foreground)]">{u.email}</td>
                <td className="px-4 py-3 text-[var(--foreground-muted)]">
                  {u.roles.map((r) => formatRoleLabel(r.role.slug)).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {consultants.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">
            No admission partner users linked to this university yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
