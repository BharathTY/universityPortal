import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { UniversityOrganisationDetailsReadOnly } from "@/components/university-organisation-details-read-only";
import { requireAuth } from "@/lib/auth";
import { consultantIsAssignedToUniversity } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultant, isConsultantOnly } from "@/lib/roles";
import { HostelGender, HostelRoomType } from "@prisma/client";
import type { HostelFeesInitial } from "@/app/dashboard/master/universities/[id]/details/university-details-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ universityId: string }> };

function buildHostelInitial(
  rows: { gender: HostelGender; roomType: HostelRoomType; amount: unknown }[],
): HostelFeesInitial {
  const out: HostelFeesInitial = {
    girlsAc: null,
    girlsNonAc: null,
    boysAc: null,
    boysNonAc: null,
  };
  for (const h of rows) {
    const n = h.amount != null ? Number(String(h.amount)) : null;
    const val = n !== null && Number.isFinite(n) ? n : null;
    if (h.gender === HostelGender.GIRLS && h.roomType === HostelRoomType.AC) out.girlsAc = val;
    if (h.gender === HostelGender.GIRLS && h.roomType === HostelRoomType.NON_AC) out.girlsNonAc = val;
    if (h.gender === HostelGender.BOYS && h.roomType === HostelRoomType.AC) out.boysAc = val;
    if (h.gender === HostelGender.BOYS && h.roomType === HostelRoomType.NON_AC) out.boysNonAc = val;
  }
  return out;
}

export default async function ConsultantOrganisationDetailsPage({ params }: PageProps) {
  const session = await requireAuth();
  if (!isConsultant(session.roles)) {
    redirect("/dashboard");
  }

  const { universityId } = await params;
  const allowed = await consultantIsAssignedToUniversity(session.sub, universityId);
  if (!allowed) {
    notFound();
  }

  const u = await prisma.university.findUnique({
    where: { id: universityId },
    select: { id: true, name: true, code: true },
  });

  if (!u) {
    notFound();
  }

  const [locRows, streamRows, hostelRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; location: string | null }>>(
      Prisma.sql`SELECT id, location FROM "University" WHERE id = ${universityId}`,
    ),
    prisma.$queryRaw<
      Array<{ id: string; name: string; degreeType: string | null; streamFee: unknown }>
    >(
      Prisma.sql`SELECT id, name, "degreeType", "streamFee" FROM "Stream" WHERE "universityId" = ${universityId} ORDER BY "sortOrder" ASC, name ASC`,
    ),
    prisma.universityHostelFee.findMany({
      where: { universityId },
      select: { gender: true, roomType: true, amount: true },
    }),
  ]);

  const location = locRows[0]?.location ?? null;
  const streams = streamRows.map((s) => ({
    id: s.id,
    name: s.name,
    degreeType: s.degreeType,
    streamFee: s.streamFee != null ? Number(String(s.streamFee)) : null,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/university"
        className="text-sm font-medium text-[var(--primary)] underline-offset-2 hover:underline"
      >
        ← Your universities
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">
        {isConsultantOnly(session.roles) ? "View university details" : "University details"}
      </h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        Read-only view of the organisation profile maintained by the master administrator.
      </p>
      <div className="mt-8">
        <UniversityOrganisationDetailsReadOnly
          universityName={u.name}
          universityCode={u.code}
          location={location}
          streams={streams}
          hostel={buildHostelInitial(hostelRows)}
        />
      </div>
    </div>
  );
}
