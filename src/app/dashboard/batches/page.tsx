import { Prisma } from "@prisma/client";
import { BatchListClient, type BatchListItem } from "@/app/dashboard/batches/batch-list-client";
import { ConsultantInPageUniversitySection } from "@/components/consultant-in-page-university-section";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly, isMaster, isUniversity } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ManageBatchesPage() {
  const session = await requireAuth();
  let batches: BatchListItem[] = [];
  let setupMessage: string | null = null;

  try {
    const consultantOwnBatches = !isMaster(session.roles) && isConsultantOnly(session.roles);
    const universityScoped =
      !isMaster(session.roles) && isUniversity(session.roles) && Boolean(session.universityId);

    const rows = await prisma.batch.findMany({
      ...(consultantOwnBatches
        ? { where: { ownerId: session.sub } }
        : universityScoped
          ? { where: { owner: { universityId: session.universityId } } }
        : {}),
      orderBy: { batchStartDate: "desc" },
      include: { owner: { select: { email: true } } },
    });

    batches = rows.map((b) => ({
      id: b.id,
      title: b.title,
      code: b.code,
      batchStartDate: b.batchStartDate.toISOString(),
      admissionEndDate: b.admissionEndDate.toISOString(),
      ownerEmail: b.owner?.email ?? null,
    }));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      setupMessage =
        "Database is missing the Batch table. From the project folder run: npx prisma db push && npm run db:seed";
    } else {
      throw e;
    }
  }

  if (setupMessage) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Manage Batches</h1>
        <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[var(--foreground)]">
          {setupMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <ConsultantInPageUniversitySection roles={session.roles} variant="batches" />
      <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Manage Batches</h1>
      <p className="mt-2 text-[var(--foreground-muted)]">Configure and manage batches from here</p>
      <div className="mt-8">
        <BatchListClient batches={batches} />
      </div>
    </div>
  );
}
