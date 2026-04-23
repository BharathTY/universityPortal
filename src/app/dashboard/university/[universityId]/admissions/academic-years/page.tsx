import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMaster, isUniversity } from "@/lib/roles";
import { assertUniversityScope } from "@/lib/university-scope";
import { AcademicYearsManager } from "@/app/dashboard/university/[universityId]/admissions/academic-years/academic-years-manager";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ universityId: string }> };

export default async function AcademicYearsPage(props: PageProps) {
  const session = await requireAuth();
  const { universityId } = await props.params;
  await assertUniversityScope(session, universityId);

  const university = await prisma.university.findUnique({ where: { id: universityId } });
  if (!university) notFound();

  const rows = await prisma.academicYear.findMany({
    where: { universityId },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, label: true, sortOrder: true },
  });

  const canManageYears = isMaster(session.roles) || isUniversity(session.roles);

  return (
    <AcademicYearsManager
      universityId={universityId}
      universityName={university.name}
      universityCode={university.code}
      initialYears={rows}
      canManageYears={canManageYears}
    />
  );
}
