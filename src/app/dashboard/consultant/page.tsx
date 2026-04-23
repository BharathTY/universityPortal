import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { isConsultantOnly } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** Legacy URL: admission partners land on the university picker and year-scoped leads flow. */
export default async function ConsultantDashboardPage() {
  const session = await requireAuth();
  if (!isConsultantOnly(session.roles)) {
    redirect("/dashboard");
  }
  redirect("/dashboard/university");
}
