import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";
import { EditUniversityForm } from "@/app/dashboard/master/universities/[id]/edit/edit-university-form";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditUniversityPage(props: PageProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const { id } = await props.params;
  const university = await prisma.university.findUnique({ where: { id } });
  if (!university) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/master/universities"
        className="text-sm font-medium text-[var(--primary)] underline underline-offset-2"
      >
        ← Universities
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Edit university</h1>
      <p className="mt-1 font-mono text-sm text-[var(--foreground-muted)]">{university.code}</p>
      <div className="mt-8">
        <EditUniversityForm
          universityId={id}
          initial={{
            name: university.name,
            email: university.email ?? "",
            phone: university.phone ?? "",
            status: university.status,
            logoUrl: university.logoUrl ?? "",
            applicationFee: university.applicationFee?.toString() ?? "0",
          }}
        />
      </div>
    </div>
  );
}
