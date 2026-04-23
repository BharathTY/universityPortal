import { notFound } from "next/navigation";
import { LeadsView } from "@/app/dashboard/batches/[batchId]/leads/leads-view";
import { requireAuth } from "@/lib/auth";
import { loadBatchLeadsViewModel } from "@/lib/batch-leads-view-model";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ batchId: string }> };

export default async function BatchDetailPage(props: PageProps) {
  const { batchId } = await props.params;
  const session = await requireAuth();
  const vm = await loadBatchLeadsViewModel(batchId, session);
  if (vm.kind === "not-found") notFound();
  if (vm.kind === "forbidden") notFound();

  return (
    <LeadsView
      batchTitle={vm.batch.title}
      batchCode={vm.batch.code}
      referralFormPath={vm.referralFormPath}
      bulkConsultant={vm.bulkConsultant}
      leads={vm.leads}
      showAssignedPartnerColumn={vm.showAssignedPartnerColumn}
    />
  );
}
