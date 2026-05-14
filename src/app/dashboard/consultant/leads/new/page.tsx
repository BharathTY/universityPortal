import { redirect } from "next/navigation";
import { ConsultantLeadsClient } from "@/app/dashboard/consultant/leads/consultant-leads-client";
import { requireAuth } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly } from "@/lib/roles";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ universityId?: string }> };

export default async function ConsultantAddLeadPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  if (!isConsultantOnly(session.roles)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const requested = sp.universityId?.trim();
  const allowed = await getAllowedConsultantUniversityIds(session.sub);
  if (allowed.length === 0 || !requested || !allowed.includes(requested)) {
    redirect("/dashboard/university");
  }

  const universityId = requested;

  const [university, streams, academicYears] = await Promise.all([
    prisma.university.findFirst({
      where: { id: universityId, status: "ACTIVE" },
      select: { id: true, name: true, code: true },
    }),
    prisma.stream.findMany({
      where: { universityId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.academicYear.findMany({
      where: { universityId },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: { id: true, label: true },
    }),
  ]);

  if (!university) {
    redirect("/dashboard/university");
  }

  return (
    <ConsultantLeadsClient
      layoutMode="addOnly"
      universityId={university.id}
      universityName={university.name}
      universityCode={university.code}
      streams={streams}
      academicYears={academicYears}
      showBulkUpload={false}
      setActiveUniversityOnMount
    />
  );
}
