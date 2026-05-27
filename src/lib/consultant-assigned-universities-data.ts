import { HostelGender, HostelRoomType, type MasterUniversityType } from "@prisma/client";
import type { HostelFeesInitial } from "@/app/dashboard/master/universities/[id]/details/university-details-form";
import { resolveConsultantAssignmentUserId } from "@/lib/consultant-dashboard-data";
import { getConsultantAssignedUniversitiesForDisplay } from "@/lib/consultant-universities";
import { availableSeats } from "@/lib/seats";
import { prisma } from "@/lib/prisma";

export type AssignedUniversityProgramPreview = {
  id: string;
  label: string;
  fee: number | null;
  seatsLeft: number;
};

export type AssignedUniversityCard = {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  status: string;
  locationLine: string;
  totalSeats: number;
  seatsRemaining: number;
  programsPreview: AssignedUniversityProgramPreview[];
  hostelFromFee: number | null;
  /** Full location string for detail modal */
  location: string | null;
  streams: { id: string; name: string; degreeType: string | null; streamFee: number | null }[];
  hostel: HostelFeesInitial;
};

const UNIVERSITY_TYPE_LABELS: Record<MasterUniversityType, string> = {
  PRIVATE: "Private",
  DEEMED: "Deemed",
  STATE_GOVT: "State Govt",
};

function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(String(value));
  return Number.isFinite(n) ? n : null;
}

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
    const val = decimalToNumber(h.amount);
    if (h.gender === HostelGender.GIRLS && h.roomType === HostelRoomType.AC) out.girlsAc = val;
    if (h.gender === HostelGender.GIRLS && h.roomType === HostelRoomType.NON_AC) out.girlsNonAc = val;
    if (h.gender === HostelGender.BOYS && h.roomType === HostelRoomType.AC) out.boysAc = val;
    if (h.gender === HostelGender.BOYS && h.roomType === HostelRoomType.NON_AC) out.boysNonAc = val;
  }
  return out;
}

function minHostelFee(rows: { amount: unknown }[]): number | null {
  let min: number | null = null;
  for (const row of rows) {
    const n = decimalToNumber(row.amount);
    if (n != null && n > 0 && (min == null || n < min)) min = n;
  }
  return min;
}

export function formatUniversityTypeLabel(type: MasterUniversityType | null | undefined): string | null {
  if (!type) return null;
  return UNIVERSITY_TYPE_LABELS[type] ?? type;
}

export function formatAssignedUniversityLocationLine(input: {
  city: string | null;
  district: string | null;
  state: string | null;
  location: string | null;
  universityType: MasterUniversityType | null;
}): string {
  const parts: string[] = [];
  const city = input.city?.trim();
  const district = input.district?.trim();
  const state = input.state?.trim();
  if (city) parts.push(city);
  else if (district) parts.push(district);
  if (state) parts.push(state);

  const loc = parts.join(", ");
  const typeLabel = formatUniversityTypeLabel(input.universityType);
  if (loc && typeLabel) return `${loc} · ${typeLabel}`;
  if (loc) return loc;
  const fallback = input.location?.trim();
  if (fallback) return fallback;
  if (typeLabel) return typeLabel;
  return "Location on file";
}

export function formatProgramPreviewLabel(name: string, degreeType: string | null): string {
  const dt = degreeType?.trim();
  if (dt && !name.toLowerCase().startsWith(dt.toLowerCase())) {
    return `${dt} — ${name}`;
  }
  return name;
}

export function formatInrCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export async function loadConsultantAssignedUniversityCards(userId: string): Promise<AssignedUniversityCard[]> {
  const assignmentUserId = await resolveConsultantAssignmentUserId(userId);
  const universities = await getConsultantAssignedUniversitiesForDisplay(assignmentUserId);
  if (universities.length === 0) return [];

  const ids = universities.map((u) => u.id);
  const details = await prisma.university.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      city: true,
      district: true,
      state: true,
      location: true,
      universityType: true,
      streams: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          degreeType: true,
          streamFee: true,
          totalSeats: true,
          filledSeats: true,
        },
      },
      hostelFees: {
        select: { gender: true, roomType: true, amount: true },
      },
    },
  });

  const detailById = new Map(details.map((d) => [d.id, d]));

  return universities.map((u) => {
    const detail = detailById.get(u.id);
    const streams = detail?.streams ?? [];
    const hostelRows = detail?.hostelFees ?? [];

    const totalSeats = streams.reduce((sum, s) => sum + s.totalSeats, 0);
    const seatsRemaining = streams.reduce((sum, s) => sum + availableSeats(s), 0);

    const streamRows = streams.map((s) => ({
      id: s.id,
      name: s.name,
      degreeType: s.degreeType,
      streamFee: decimalToNumber(s.streamFee),
    }));

    const programsPreview = streams.slice(0, 4).map((s) => ({
      id: s.id,
      label: formatProgramPreviewLabel(s.name, s.degreeType),
      fee: decimalToNumber(s.streamFee),
      seatsLeft: availableSeats(s),
    }));

    return {
      id: u.id,
      name: u.name,
      code: u.code,
      logoUrl: u.logoUrl,
      status: u.status,
      locationLine: formatAssignedUniversityLocationLine({
        city: detail?.city ?? null,
        district: detail?.district ?? null,
        state: detail?.state ?? null,
        location: detail?.location ?? null,
        universityType: detail?.universityType ?? null,
      }),
      totalSeats,
      seatsRemaining,
      programsPreview,
      hostelFromFee: minHostelFee(hostelRows),
      location: detail?.location?.trim() || null,
      streams: streamRows,
      hostel: buildHostelInitial(hostelRows),
    };
  });
}
