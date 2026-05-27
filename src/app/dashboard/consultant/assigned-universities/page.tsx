import { redirect } from "next/navigation";
import { ConsultantAssignedUniversitiesClient } from "@/components/consultant-assigned-universities-client";
import { requireAuth } from "@/lib/auth";
import { loadConsultantAssignedUniversityCards } from "@/lib/consultant-assigned-universities-data";
import { isConsultant, isConsultantOnly } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ConsultantAssignedUniversitiesPage() {
  const session = await requireAuth();
  if (!isConsultant(session.roles) || !isConsultantOnly(session.roles)) {
    redirect("/dashboard");
  }

  const universities = await loadConsultantAssignedUniversityCards(session.sub);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
        Consultant
      </p>
      <h1 className="mt-1 font-serif text-3xl font-bold text-[var(--foreground)]">Assigned Universities</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--foreground-muted)]">
        Click any card to view full details, programmes, fees and hostel options.
      </p>
      <div className="mt-8">
        <ConsultantAssignedUniversitiesClient universities={universities} />
      </div>
    </div>
  );
}
