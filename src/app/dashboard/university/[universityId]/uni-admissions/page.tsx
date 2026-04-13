import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { assertUniversityScope } from "@/lib/university-scope";
import {
  AdmissionsDashboard,
  type AdmissionLeadRow,
} from "@/app/dashboard/university/[universityId]/admissions/admissions-dashboard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ universityId: string }>;
  searchParams: Promise<{ year?: string; stream?: string; page?: string; pageSize?: string }>;
};

/** Leads created by university staff (same UI as Admissions, separate list). */
export default async function UniversityUniAdmissionsPage(props: PageProps) {
  const session = await requireAuth();
  const { universityId } = await props.params;
  assertUniversityScope(session, universityId);

  const sp = await props.searchParams;
  const selectedYearId = sp.year && sp.year.length > 0 ? sp.year : null;
  const selectedStreamId = sp.stream && sp.stream.length > 0 ? sp.stream : null;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(5, Number(sp.pageSize ?? "10") || 10));

  const university = await prisma.university.findUnique({ where: { id: universityId } });
  if (!university) notFound();

  const [years, streams] = await Promise.all([
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
  ]);

  const where: Prisma.AdmissionLeadWhereInput = {
    universityId,
    ...(selectedYearId ? { academicYearId: selectedYearId } : {}),
    ...(selectedStreamId ? { streamId: selectedStreamId } : {}),
    createdBy: {
      is: {
        universityId,
        roles: { some: { role: { slug: ROLES.university } } },
      },
    },
  };

  const [total, leadRows] = await Promise.all([
    prisma.admissionLead.count({ where }),
    prisma.admissionLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        academicYear: { select: { label: true } },
        stream: { select: { name: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const leads: AdmissionLeadRow[] = leadRows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    mobile: r.mobile,
    admissionStatus: r.admissionStatus,
    createdAt: r.createdAt.toISOString(),
    academicYear: r.academicYear,
    stream: r.stream,
  }));

  return (
    <AdmissionsDashboard
      universityId={universityId}
      listPathSegment="uni-admissions"
      breadcrumbLabel="Uni-Admission"
      pageTitle="Admission (Uni-Admission)"
      pageSubtitle="Leads created by your university team — filter by academic year and stream."
      years={years}
      streams={streams}
      leads={leads}
      total={total}
      page={page > totalPages ? totalPages : page}
      pageSize={pageSize}
      totalPages={totalPages}
      selectedYearId={selectedYearId}
      selectedStreamId={selectedStreamId}
    />
  );
}
