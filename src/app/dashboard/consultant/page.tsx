import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { resolveConsultantActiveUniversityId } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly } from "@/lib/roles";
import { LeadPipelineStatus, AdmissionReviewStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ConsultantDashboardPage() {
  const session = await requireAuth();
  if (!isConsultantOnly(session.roles)) {
    redirect("/dashboard");
  }
  const { universityId } = await resolveConsultantActiveUniversityId(session);
  if (!universityId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Consultant dashboard</h1>
        <p className="mt-4 text-sm text-[var(--foreground-muted)]">
          Your account is not linked to a university yet. Ask a master admin to assign one or more universities.
        </p>
      </div>
    );
  }

  const [leadsNew, leadsLost, leadsConverted, applications, admissionsWon] = await Promise.all([
    prisma.admissionLead.count({
      where: { universityId, createdByUserId: session.sub, pipelineStatus: LeadPipelineStatus.NEW },
    }),
    prisma.admissionLead.count({
      where: { universityId, createdByUserId: session.sub, pipelineStatus: LeadPipelineStatus.LOST },
    }),
    prisma.admissionLead.count({
      where: { universityId, createdByUserId: session.sub, pipelineStatus: LeadPipelineStatus.CONVERTED },
    }),
    prisma.application.count({
      where: {
        universityId,
        user: { studentOfId: session.sub },
      },
    }),
    prisma.application.count({
      where: {
        universityId,
        user: { studentOfId: session.sub },
        admissionReview: AdmissionReviewStatus.APPROVED,
      },
    }),
  ]);

  const batches = await prisma.batch.findMany({
    where: { ownerId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, title: true, code: true },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Consultant dashboard</h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        Leads, applications, and units (batches) for your active university (switch in the header if you have several).
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Leads (open)" value={String(leadsNew)} href="/dashboard/consultant/leads?pipeline=NEW" />
        <StatCard label="Applications" value={String(applications)} href="/dashboard/consultant/leads" />
        <StatCard label="Admissions (approved)" value={String(admissionsWon)} href="/dashboard/consultant/leads" />
        <StatCard label="Lost leads" value={String(leadsLost)} href="/dashboard/consultant/leads?pipeline=LOST" />
      </div>

      <div className="mt-2 text-xs text-[var(--foreground-muted)]">
        Converted leads: <span className="font-medium text-[var(--foreground)]">{leadsConverted}</span>
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Units (batches)</h2>
          <Link
            href="/dashboard/batches"
            className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
          >
            View all batches
          </Link>
        </div>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Use batches as intake &ldquo;units&rdquo; — link students and reporting.
        </p>
        {batches.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">No batches yet. Create one under Batches.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--card)]">
            {batches.map((b) => (
              <li key={b.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-[var(--foreground)]">{b.title}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{b.code}</p>
                </div>
                <Link
                  href="/dashboard/batches"
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/dashboard/consultant/leads"
          className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)]"
        >
          Leads
        </Link>
        <Link
          href="/dashboard/consultant/students"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
        >
          Manage users
        </Link>
      </div>
    </div>
  );
}

function StatCard(props: { label: string; value: string; href: string }) {
  return (
    <Link
      href={props.href}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:border-[var(--primary)]/40"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">{props.label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{props.value}</p>
    </Link>
  );
}
