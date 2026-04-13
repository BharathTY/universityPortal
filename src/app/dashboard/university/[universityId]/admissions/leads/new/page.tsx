import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMISSION_LEAD_ROLE_SLUGS } from "@/lib/admission-lead-role";
import { assertUniversityScope } from "@/lib/university-scope";
import { CreateLeadForm } from "@/app/dashboard/university/[universityId]/admissions/leads/new/create-lead-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ universityId: string }> };

export default async function CreateLeadPage(props: PageProps) {
  const session = await requireAuth();
  const { universityId } = await props.params;
  assertUniversityScope(session, universityId);

  const university = await prisma.university.findUnique({ where: { id: universityId } });
  if (!university) notFound();

  const [years, streams, attributionRoles] = await Promise.all([
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
    prisma.role.findMany({
      where: { slug: { in: [...ADMISSION_LEAD_ROLE_SLUGS] } },
      orderBy: { slug: "asc" },
      select: { id: true, slug: true, name: true },
    }),
  ]);

  return (
    <CreateLeadForm
      universityId={universityId}
      years={years}
      streams={streams}
      attributionRoles={attributionRoles}
    />
  );
}
