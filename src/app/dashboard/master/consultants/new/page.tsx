import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";
import { NewConsultantForm } from "@/app/dashboard/master/consultants/new/new-consultant-form";

export default async function NewConsultantPage() {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const universities = await prisma.university.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/master/consultants"
        className="text-sm font-medium text-[var(--primary)] underline underline-offset-2"
      >
        ← Admission partners
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Add admission partner</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        Creates an admission partner account and emails account details (password auto or manual). Sign-in uses OTP; SMTP
        optional (dev logs to console).
      </p>
      <div className="mt-8">
        <NewConsultantForm universities={universities} />
      </div>
    </div>
  );
}
