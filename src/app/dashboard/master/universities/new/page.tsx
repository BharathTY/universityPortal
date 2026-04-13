import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { isMaster } from "@/lib/roles";
import { NewUniversityForm } from "@/app/dashboard/master/universities/new/new-university-form";

export default async function NewUniversityPage() {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

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
        Creates the organisation and a university-admin user, then emails account details including an auto-generated
        password. Sign-in uses OTP; the password is for your records.
      </p>
      <div className="mt-8">
        <NewUniversityForm />
      </div>
    </div>
  );
}
