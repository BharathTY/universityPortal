import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertUniversityScope } from "@/lib/university-scope";
import { StreamsManager } from "@/app/dashboard/university/[universityId]/admissions/streams/streams-manager";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ universityId: string }> };

export default async function StreamsPage(props: PageProps) {
  const session = await requireAuth();
  const { universityId } = await props.params;
  await assertUniversityScope(session, universityId);

  const university = await prisma.university.findUnique({ where: { id: universityId } });
  if (!university) notFound();

  const rows = await prisma.stream.findMany({
    where: { universityId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sortOrder: true },
  });

  return <StreamsManager universityId={universityId} initialStreams={rows} />;
}
