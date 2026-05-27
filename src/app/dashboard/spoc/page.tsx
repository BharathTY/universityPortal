import { redirect } from "next/navigation";
import { ConsultantDashboardView } from "@/components/consultant-dashboard-view";
import { requireAuth } from "@/lib/auth";
import { getConsultantDashboardSnapshot } from "@/lib/consultant-dashboard-data";
import { isConsultantSpoc } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function SpocDashboardPage() {
  const session = await requireAuth();
  if (!isConsultantSpoc(session.roles)) {
    redirect("/dashboard");
  }

  const snapshot = await getConsultantDashboardSnapshot(session.sub);

  return (
    <ConsultantDashboardView
      title="SPOC dashboard"
      subtitle="Manage leads and view assigned universities for your consultant account."
      snapshot={snapshot}
      showMouPanel={false}
    />
  );
}
