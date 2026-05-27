import { redirect } from "next/navigation";
import { ConsultantDashboardView } from "@/components/consultant-dashboard-view";
import { requireAuth } from "@/lib/auth";
import { getConsultantDashboardSnapshot } from "@/lib/consultant-dashboard-data";
import { canSeeMouPanel, isConsultantPrincipal } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ConsultantHomePage() {
  const session = await requireAuth();
  if (!isConsultantPrincipal(session.roles)) {
    redirect("/dashboard");
  }

  const snapshot = await getConsultantDashboardSnapshot(session.sub);

  return (
    <ConsultantDashboardView
      title="Consultant dashboard"
      subtitle="Overview of your leads, universities, payments, and seat capacity."
      snapshot={snapshot}
      showMouPanel={canSeeMouPanel(session.roles)}
    />
  );
}
