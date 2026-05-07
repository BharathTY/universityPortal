import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { isConsultantOnly } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ConsultantLeadsPage() {
  const session = await requireAuth();
  if (!isConsultantOnly(session.roles)) {
    redirect("/dashboard");
  }
  redirect("/dashboard/university");
}
