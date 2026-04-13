import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LeadsView } from "@/app/dashboard/batches/[batchId]/leads/leads-view";

type PageProps = { params: Promise<{ batchId: string }> };

export default async function BatchLeadsPage(props: PageProps) {
  const { batchId } = await props.params;
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true, title: true, code: true },
  });

  if (!batch) notFound();

  return <LeadsView batchTitle={batch.title} batchCode={batch.code} />;
}
