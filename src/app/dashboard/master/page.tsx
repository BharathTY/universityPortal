import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getMasterDashboardSnapshot } from "@/lib/master-dashboard-data";
import { leadStatusBadgeClass } from "@/lib/lead-status-ui";
import { isMaster } from "@/lib/roles";

export const dynamic = "force-dynamic";

type SummaryCard = {
  label: string;
  value: number;
  href: string;
};

export default async function MasterDashboardPage() {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const { counts, recentUniversities, recentLeads } = await getMasterDashboardSnapshot();

  const cards: SummaryCard[] = [
    { label: "Total Universities", value: counts.totalUniversities, href: "/dashboard/master/universities" },
    { label: "Total Consultants", value: counts.totalConsultants, href: "/dashboard/master/consultants" },
    { label: "Total Leads", value: counts.totalLeads, href: "/dashboard/master/leads" },
    {
      label: "Ready to Pay",
      value: counts.readyToPay,
      href: "/dashboard/master/leads?status=READY_TO_PAY",
    },
    {
      label: "Paid Students",
      value: counts.paidStudents,
      href: "/dashboard/master/leads?status=PAYMENT_DONE",
    },
    {
      label: "Available Seats",
      value: counts.availableSeats,
      href: "/dashboard/master/seats?type=available",
    },
    {
      label: "Filled Seats",
      value: counts.filledSeats,
      href: "/dashboard/master/seats?type=filled",
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Master dashboard</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--foreground-muted)]">
        Platform-wide overview — universities, consultants, student leads, and seat capacity across all organisations.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-[var(--primary)]/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">{card.value}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10" aria-labelledby="recent-uni-title">
        <h2 id="recent-uni-title" className="text-lg font-semibold text-[var(--foreground)]">
          Recent university onboarding
        </h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">Latest organisations added to the platform.</p>

        {recentUniversities.length === 0 ? (
          <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">
            No universities onboarded yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                <tr>
                  <th className="px-3 py-3 font-semibold text-[var(--foreground)]">University name</th>
                  <th className="px-3 py-3 font-semibold text-[var(--foreground)]">State</th>
                  <th className="px-3 py-3 font-semibold text-[var(--foreground)]">District</th>
                </tr>
              </thead>
              <tbody>
                {recentUniversities.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-3 font-medium text-[var(--foreground)]">{u.name}</td>
                    <td className="px-3 py-3 text-[var(--foreground-muted)]">{u.state ?? "—"}</td>
                    <td className="px-3 py-3 text-[var(--foreground-muted)]">{u.district ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="recent-leads-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="recent-leads-title" className="text-lg font-semibold text-[var(--foreground)]">
              Recent student leads
            </h2>
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">
              Latest prospects across all universities and consultants.
            </p>
          </div>
          <Link
            href="/dashboard/master/leads"
            className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
          >
            View all
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">
            No student leads yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                <tr>
                  <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Student name</th>
                  <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Email</th>
                  <th className="px-3 py-3 font-semibold text-[var(--foreground)]">University</th>
                  <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Consultant</th>
                  <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Ageing</th>
                  <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((l) => (
                  <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-3 font-medium text-[var(--foreground)]">{l.name}</td>
                    <td className="px-3 py-3 text-[var(--foreground-muted)]">{l.email}</td>
                    <td className="px-3 py-3 text-[var(--foreground)]">{l.universityName}</td>
                    <td className="px-3 py-3 text-[var(--foreground-muted)]">{l.consultantName ?? "—"}</td>
                    <td className="px-3 py-3 tabular-nums text-[var(--foreground-muted)]">{l.ageingDays}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${leadStatusBadgeClass(l.statusRaw)}`}
                      >
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
