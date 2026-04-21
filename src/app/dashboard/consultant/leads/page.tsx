import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { resolveConsultantActiveUniversityId } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly } from "@/lib/roles";
import { ConsultantLeadsClient } from "@/app/dashboard/consultant/leads/consultant-leads-client";

export const dynamic = "force-dynamic";

export default async function ConsultantLeadsPage() {
  const session = await requireAuth();
  if (!isConsultantOnly(session.roles)) {
    redirect("/dashboard");
  }
  const { universityId } = await resolveConsultantActiveUniversityId(session);
  if (!universityId) {
    redirect("/dashboard/consultant");
  }

  const [university, streams] = await Promise.all([
    prisma.university.findUnique({
      where: { id: universityId },
      select: { name: true, code: true },
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
      streams={streams}
    />
  );
}
