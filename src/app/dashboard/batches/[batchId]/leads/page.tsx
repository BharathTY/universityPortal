import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ batchId: string }> };

/** Legacy URL — batch leads now live at `/dashboard/batches/[batchId]`. */
export default async function BatchLeadsRedirectPage(props: PageProps) {
  const { batchId } = await props.params;
  redirect(`/dashboard/batches/${batchId}`);
}
