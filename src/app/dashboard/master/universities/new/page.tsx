import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { isMaster } from "@/lib/roles";
import { NewUniversityWizard } from "@/app/dashboard/master/universities/new/new-university-wizard";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewUniversityPage(props: PageProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const sp = await props.searchParams;
  const masterIdRaw = sp.masterId;
  const initialMasterId = typeof masterIdRaw === "string" ? masterIdRaw : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/master/universities"
        className="text-sm font-medium text-[var(--primary)] underline underline-offset-2"
      >
        ← Universities
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Add university</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        Step 1: select from the master catalog — name, address, and location auto-fill and are locked.
        Step 2: SPOC, programmes, fees, hostel details, CET seats, and documents.
      </p>
      <div className="mt-8">
        <NewUniversityWizard initialMasterId={initialMasterId} />
      </div>
    </div>
  );
}
