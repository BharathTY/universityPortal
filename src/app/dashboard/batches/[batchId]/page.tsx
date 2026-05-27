import { notFound } from "next/navigation";
import { LeadsView } from "@/app/dashboard/batches/[batchId]/leads/leads-view";
import { requireAuth } from "@/lib/auth";
import { loadBatchLeadsViewModel } from "@/lib/batch-leads-view-model";
import { parsePage, parsePageSize, searchParamOne } from "@/lib/list-query";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BatchDetailPage(props: PageProps) {
  const { batchId } = await props.params;
  const sp = await props.searchParams;
  const session = await requireAuth();
  const vm = await loadBatchLeadsViewModel(batchId, session, {
    q: searchParamOne(sp, "q"),
    sort: searchParamOne(sp, "sort"),
    page: parsePage(searchParamOne(sp, "page")),
    pageSize: parsePageSize(searchParamOne(sp, "pageSize"), 25),
  });
  if (vm.kind === "not-found") notFound();
  if (vm.kind === "forbidden") notFound();

  return (
    <LeadsView
      batchId={vm.batch.id}
      batchTitle={vm.batch.title}
      batchCode={vm.batch.code}
      referralFormPath={vm.referralFormPath}
      bulkConsultant={vm.bulkConsultant}
      leads={vm.leads}
      total={vm.total}
      page={vm.page}
      pageSize={vm.pageSize}
      totalPages={vm.totalPages}
      q={searchParamOne(sp, "q") ?? ""}
      sort={searchParamOne(sp, "sort") ?? "latest"}
      showAssignedPartnerColumn={vm.showAssignedPartnerColumn}
    />
  );
}
