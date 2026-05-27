import { notFound, redirect } from "next/navigation";

import { ConsultantLeadsClient } from "@/app/dashboard/consultant/leads/consultant-leads-client";
import { requireAuth } from "@/lib/auth";
import {
  consultantLeadDetailSelect,
  serializeConsultantLeadForClient,
} from "@/lib/consultant-lead-payload";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly } from "@/lib/roles";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function ConsultantEditLeadPage({ params }: PageProps) {
  const session = await requireAuth();
  if (!isConsultantOnly(session.roles)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const allowed = await getAllowedConsultantUniversityIds(session.sub);
  if (allowed.length === 0) {
    redirect("/dashboard/consultant/leads");
  }

  const lead = await prisma.admissionLead.findFirst({
    where: { id, createdByUserId: session.sub, universityId: { in: allowed } },
    select: consultantLeadDetailSelect,
  });
  if (!lead) {
    notFound();
  }

  const universities = await prisma.university.findMany({
    where: { id: { in: allowed }, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      streams: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      },
      academicYears: {
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        select: { id: true, label: true },
      },
    },
  });

  if (universities.length === 0) {
    redirect("/dashboard/consultant/leads");
  }

  const initial = universities.find((u) => u.id === lead.universityId) ?? universities[0]!;

  return (
    <ConsultantLeadsClient
      layoutMode="edit"
      leadId={lead.id}
      initialLead={serializeConsultantLeadForClient(lead)}
      universityId={initial.id}
      universityName={initial.name}
      universityCode={initial.code}
      streams={initial.streams}
      academicYears={initial.academicYears}
      universityOptions={universities}
      initialUniversityId={lead.universityId}
      showBulkUpload={false}
      setActiveUniversityOnMount
    />
  );
}
