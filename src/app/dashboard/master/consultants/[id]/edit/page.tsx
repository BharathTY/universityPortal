import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";
import { ROLES } from "@/lib/roles";
import { EditConsultantForm } from "@/app/dashboard/master/consultants/[id]/edit/edit-consultant-form";

const consultantSlugs = [ROLES.consultant, ROLES.counsellor, ROLES.consultantMaster] as const;

type PageProps = { params: Promise<{ id: string }> };

export default async function EditConsultantPage(props: PageProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const { id } = await props.params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: { include: { role: true } },
      consultantUniversities: { select: { universityId: true } },
    },
  });

  if (!user) notFound();

  const isConsultant = user.roles.some((r) => consultantSlugs.includes(r.role.slug as (typeof consultantSlugs)[number]));
  if (!isConsultant) {
    redirect("/dashboard/master/consultants");
  }

  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  const joinIds = user.consultantUniversities.map((c) => c.universityId);
  const universityIds =
    joinIds.length > 0
      ? joinIds
      : user.universityId
        ? [user.universityId]
        : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/master/consultants"
        className="text-sm font-medium text-[var(--primary)] underline underline-offset-2"
      >
        ← Consultants
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Edit consultant</h1>
      <div className="mt-8">
        <EditConsultantForm
          userId={id}
          universities={universities}
          initial={{
            name: user.name ?? "",
            email: user.email,
            phone: user.phone ?? "",
            universityIds,
            accountStatus: user.accountStatus,
          }}
        />
      </div>
    </div>
  );
}
