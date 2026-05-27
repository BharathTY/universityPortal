import { redirect } from "next/navigation";
import { ConsultantStudentLeadsClient } from "@/app/dashboard/consultant/leads/consultant-student-leads-client";
import { requireAuth } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly } from "@/lib/roles";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ action?: string }> };

export default async function ConsultantLeadsPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  if (!isConsultantOnly(session.roles)) {
    redirect("/dashboard");
  }

  const { action } = await searchParams;
  const ids = await getAllowedConsultantUniversityIds(session.sub);
  const universities =
    ids.length === 0
      ? []
      : await prisma.university.findMany({
          where: { id: { in: ids } },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true },
        });

  return (
    <ConsultantStudentLeadsClient showAddForm={action === "add"} universities={universities} />
  );
}
