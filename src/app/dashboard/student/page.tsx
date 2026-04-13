import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { isStudent } from "@/lib/roles";

/** Student home opens the application flow directly. */
export default async function StudentHomePage() {
  const session = await requireAuth();
  if (!isStudent(session.roles)) {
    redirect("/dashboard");
  }

  redirect("/dashboard/student/application");
}
