import { redirect } from "next/navigation";

export default function MasterDashboardRedirect() {
  redirect("/dashboard/master/universities");
}
