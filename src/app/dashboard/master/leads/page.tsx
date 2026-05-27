import { redirect } from "next/navigation";
import { MasterLeadsClient } from "@/app/dashboard/master/leads/master-leads-client";
import { requireAuth } from "@/lib/auth";
import {
  getMasterLeadsFilterOptions,
  getMasterLeadsSummary,
  listMasterLeads,
  parseMasterLeadsQueryFromSearchParams,
} from "@/lib/master-leads-data";
import { isMaster } from "@/lib/roles";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MasterLeadsPage(props: PageProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const sp = await props.searchParams;
  const query = parseMasterLeadsQueryFromSearchParams(sp);

  const [summary, filterOptions, list] = await Promise.all([
    getMasterLeadsSummary(),
    getMasterLeadsFilterOptions(),
    listMasterLeads(query),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Student leads</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        Cross-university view of all student leads — search, filter, and review status and payment indicators per PRD
        §4.4.
      </p>

      <div className="mt-8">
        <MasterLeadsClient
          initialSummary={summary}
          initialFilterOptions={filterOptions}
          initialLeads={list.leads.map((l) => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
          }))}
          initialTotal={list.total}
          initialPage={list.page}
          initialPageSize={list.pageSize}
          initialTotalPages={list.totalPages}
          initialQuery={query}
        />
      </div>
    </div>
  );
}
