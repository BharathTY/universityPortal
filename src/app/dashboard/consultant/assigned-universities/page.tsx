import { Prisma, HostelGender, HostelRoomType } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  ConsultantAssignedUniversitiesClient,
  type AssignedUniversityCard,
} from "@/components/consultant-assigned-universities-client";
import type { HostelFeesInitial } from "@/app/dashboard/master/universities/[id]/details/university-details-form";
import { requireAuth } from "@/lib/auth";
import { resolveConsultantAssignmentUserId } from "@/lib/consultant-dashboard-data";
import { getConsultantAssignedUniversitiesForDisplay } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultant, isConsultantOnly } from "@/lib/roles";

export const dynamic = "force-dynamic";

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

async function loadUniversitiesWithDetails(userId: string): Promise<AssignedUniversityCard[]> {
  const assignmentUserId = await resolveConsultantAssignmentUserId(userId);
  const universities = await getConsultantAssignedUniversitiesForDisplay(assignmentUserId);
  if (universities.length === 0) return [];

  const ids = universities.map((u) => u.id);
  const [locRows, streamRows, hostelRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; location: string | null }>>(
      Prisma.sql`SELECT id, location FROM "University" WHERE id IN (${Prisma.join(ids)})`,
    ),
    prisma.$queryRaw<
      Array<{ universityId: string; id: string; name: string; degreeType: string | null; streamFee: unknown }>
    >(
      Prisma.sql`SELECT "universityId", id, name, "degreeType", "streamFee" FROM "Stream" WHERE "universityId" IN (${Prisma.join(ids)}) ORDER BY "sortOrder" ASC, name ASC`,
    ),
    prisma.universityHostelFee.findMany({
      where: { universityId: { in: ids } },
      select: { universityId: true, gender: true, roomType: true, amount: true },
    }),
  ]);

  const locationById = new Map(locRows.map((r) => [r.id, r.location]));
  const streamsByUni = new Map<string, AssignedUniversityCard["streams"]>();
  for (const s of streamRows) {
    const list = streamsByUni.get(s.universityId) ?? [];
    list.push({
      id: s.id,
      name: s.name,
      degreeType: s.degreeType,
      streamFee: s.streamFee != null ? Number(String(s.streamFee)) : null,
    });
    streamsByUni.set(s.universityId, list);
  }
  const hostelByUni = new Map<string, HostelFeesInitial>();
  for (const id of ids) {
    const rows = hostelRows.filter((h) => h.universityId === id);
    hostelByUni.set(id, buildHostelInitial(rows));
  }

  return universities.map((u) => ({
    id: u.id,
    name: u.name,
    code: u.code,
    logoUrl: u.logoUrl,
    status: u.status,
    location: locationById.get(u.id) ?? null,
    streams: streamsByUni.get(u.id) ?? [],
    hostel: hostelByUni.get(u.id) ?? buildHostelInitial([]),
  }));
}

export default async function ConsultantAssignedUniversitiesPage() {
  const session = await requireAuth();
  if (!isConsultant(session.roles) || !isConsultantOnly(session.roles)) {
    redirect("/dashboard");
  }

  const universities = await loadUniversitiesWithDetails(session.sub);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Assigned universities</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--foreground-muted)]">
        Organisations linked to your consultant account. Select a card to view programmes and hostel fees.
      </p>
      <div className="mt-8">
        <ConsultantAssignedUniversitiesClient universities={universities} />
      </div>
    </div>
  );
}
