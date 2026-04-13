import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly } from "@/lib/roles";
import { ConsultantLeadsClient } from "@/app/dashboard/consultant/leads/consultant-leads-client";

export const dynamic = "force-dynamic";

export default async function ConsultantLeadsPage() {
  const session = await requireAuth();
  if (!isConsultantOnly(session.roles)) {
    redirect("/dashboard");
  }
  if (!session.universityId) {
    redirect("/dashboard/consultant");
  }

  const universityId = session.universityId;

  const [university, years, streams] = await Promise.all([
    prisma.university.findUnique({
      where: { id: universityId },
      select: { name: true, code: true },
    }),
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

  return (
    <ConsultantLeadsClient
      universityName={university?.name ?? "University"}
      universityCode={university?.code ?? ""}
      years={years}
      streams={streams}
    />
  );
}
