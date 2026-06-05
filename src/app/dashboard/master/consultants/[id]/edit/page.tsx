import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";
import { ROLES } from "@/lib/roles";
import { EditConsultantForm } from "@/app/dashboard/master/consultants/[id]/edit/edit-consultant-form";
import { loadConsultantSpocsGrouped } from "@/lib/consultant-spoc";

const consultantSlugs = [
  ROLES.consultant,
  ROLES.counsellor,
  ROLES.consultantMaster,
  ROLES.qspidersBranch,
] as const;

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
      consultantDocuments: {
        where: { kind: "MOU" },
        orderBy: { uploadedAt: "desc" },
        select: { fileName: true, fileUrl: true, academicYear: true },
      },
    },
  });

  if (!user) notFound();

  const isConsultant = user.roles.some((r) => consultantSlugs.includes(r.role.slug as (typeof consultantSlugs)[number]));
  if (!isConsultant) {
    redirect("/dashboard/master/consultants");
  }

  const universities = await prisma.university.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
  const activeIds = new Set(universities.map((u) => u.id));

  const joinIds = user.consultantUniversities.map((c) => c.universityId);
  const universityIds =
    joinIds.length > 0
      ? joinIds.filter((id) => activeIds.has(id))
      : user.universityId && activeIds.has(user.universityId)
        ? [user.universityId]
        : [];

  const spocsByConsultant = await loadConsultantSpocsGrouped([id]);
  const spocs = spocsByConsultant.get(id) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/master/consultants"
        className="text-sm font-medium text-[var(--primary)] underline underline-offset-2"
      >
        ← Admission partners
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Edit admission partner</h1>
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
            companyName: user.companyName ?? "",
            designation: user.designation ?? "",
            gstNumber: user.gstNumber ?? "",
            panNumber: user.panNumber ?? "",
            address: user.address ?? "",
            city: user.city ?? "",
            district: user.district ?? "",
            state: user.state ?? "",
            academicYear: user.academicYear ?? "",
            mouDocuments: user.consultantDocuments,
            spocs,
          }}
        />
      </div>
    </div>
  );
}
