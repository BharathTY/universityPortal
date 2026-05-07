import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertUniversityScope } from "@/lib/university-scope";
import { UniversityApplicationsClient } from "@/app/dashboard/university/[universityId]/applications/university-applications-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ universityId: string }>;
  searchParams: Promise<{ year?: string; stream?: string }>;
};

export default async function UniversityApplicationsPage(props: PageProps) {
  const session = await requireAuth();
  const { universityId } = await props.params;
  await assertUniversityScope(session, universityId);
  const sp = await props.searchParams;
  const yearId = sp.year && sp.year.length > 0 ? sp.year : null;
  const streamId = sp.stream && sp.stream.length > 0 ? sp.stream : null;

  const university = await prisma.university.findUnique({ where: { id: universityId } });
  if (!university) notFound();

  const leadFilter =
    yearId || streamId
      ? {
          lead: {
            is: {
              ...(yearId ? { academicYearId: yearId } : {}),
              ...(streamId ? { streamId: streamId } : {}),
            },
          },
        }
      : {};

  const [years, streams, applications] = await Promise.all([
    prisma.academicYear.findMany({
      where: { universityId },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: { id: true, label: true },
    }),
    prisma.stream.findMany({
      where: { universityId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.application.findMany({
      where: {
        universityId,
        ...leadFilter,
      },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        lead: {
          include: {
            stream: { select: { name: true } },
            academicYear: { select: { label: true } },
          },
        },
      },
    }),
  ]);

  const rows = applications.map((a) => ({
    id: a.id,
    displayId: a.referenceCode ?? a.id,
    studentName: a.user.name ?? a.user.email,
    mobile: a.user.phone ?? "—",
    course: a.lead?.stream.name ?? "—",
    status: a.admissionReview,
    leadCreatedAt: a.lead?.createdAt?.toISOString() ?? a.createdAt.toISOString(),
  }));

  return (
    <UniversityApplicationsClient
      universityId={universityId}
      universityName={university.name}
      years={years}
      streams={streams}
      applications={rows}
    />
  );
}
