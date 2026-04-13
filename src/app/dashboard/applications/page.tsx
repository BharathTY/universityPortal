import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getApplicationMetrics } from "@/lib/application-metrics";
import { canAccessLeadsAndBatches } from "@/lib/roles";
import { ApplicationMetricsOverview } from "@/app/dashboard/applications/application-metrics-overview";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const session = await requireAuth();
  if (!canAccessLeadsAndBatches(session.roles)) {
    redirect("/dashboard");
  }

  const { rows, setupMessage } = await getApplicationMetrics(session);

  if (setupMessage) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Applications</h1>
        <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[var(--foreground)]">
          {setupMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Applications</h1>
      <p className="mt-2 text-[var(--foreground-muted)]">Overview of all applications</p>

      <ApplicationMetricsOverview rows={rows} />
    </div>
  );
}
