import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { ADMISSION_PARTNER_ROLE_SLUGS } from "@/lib/admission-partner-slugs";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function MasterConsultantAdmissionsPage(props: PageProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const { id } = await props.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: { include: { role: true } },
    },
  });
  if (!user) notFound();

  const isPartner = user.roles.some((r) =>
    (ADMISSION_PARTNER_ROLE_SLUGS as readonly string[]).includes(r.role.slug),
  );
  if (!isPartner) notFound();

  const [leads, applications] = await Promise.all([
    prisma.admissionLead.findMany({
      where: { createdByUserId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        admissionState: true,
        createdAt: true,
        assignedPartnerDisplayName: true,
        university: { select: { name: true, code: true } },
        stream: { select: { name: true } },
      },
    }),
    prisma.application.findMany({
      where: { user: { studentOfId: id } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        university: { select: { name: true, code: true } },
        user: { select: { name: true, email: true } },
        lead: { select: { stream: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/master/consultants"
        className="text-sm font-medium text-[var(--primary)] underline underline-offset-2"
      >
        ← Admission partners
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Admissions</h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        {user.name ?? user.email} — leads created by this partner (with university) and applications for students
        they manage.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Leads</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">University</th>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Assigned partner (snapshot)</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-2">
                    {l.firstName} {l.lastName}
                    <div className="text-xs text-[var(--foreground-muted)]">{l.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    {l.university.name}{" "}
                    <span className="text-xs text-[var(--foreground-muted)]">({l.university.code})</span>
                  </td>
                  <td className="px-3 py-2">{l.stream.name}</td>
                  <td className="px-3 py-2">{l.admissionState ?? "—"}</td>
                  <td className="max-w-[12rem] truncate px-3 py-2 text-xs" title={l.assignedPartnerDisplayName ?? ""}>
                    {l.assignedPartnerDisplayName ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                    {l.createdAt.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leads.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">No leads yet for this partner.</p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Applications (managed students)</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">University</th>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-2">
                    {a.user.name ?? "—"}
                    <div className="text-xs text-[var(--foreground-muted)]">{a.user.email}</div>
                  </td>
                  <td className="px-3 py-2">{a.university?.name ?? "—"}</td>
                  <td className="px-3 py-2">{a.lead?.stream.name ?? "—"}</td>
                  <td className="px-3 py-2">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {applications.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">No managed student applications.</p>
        ) : null}
      </section>
    </div>
  );
}
