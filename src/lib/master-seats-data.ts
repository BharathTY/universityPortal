import { availableSeats } from "@/lib/seats";
import { prisma } from "@/lib/prisma";

export type MasterSeatRow = {
  streamId: string;
  universityId: string;
  universityName: string;
  universityCode: string;
  streamName: string;
  degreeType: string | null;
  totalSeats: number;
  filledSeats: number;
  availableSeats: number;
};

export type MasterSeatsListResult = {
  rows: MasterSeatRow[];
  totalSeats: number;
  totalFilled: number;
  totalAvailable: number;
};

/** Stream-level seat breakdown for master admin (available or filled view). */
export async function listMasterSeatRows(
  type: "available" | "filled",
): Promise<MasterSeatsListResult> {
  const streams = await prisma.stream.findMany({
    orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      degreeType: true,
      totalSeats: true,
      filledSeats: true,
      universityId: true,
      university: { select: { name: true, code: true } },
    },
  });

  const mapped: MasterSeatRow[] = streams.map((s) => ({
    streamId: s.id,
    universityId: s.universityId,
    universityName: s.university.name,
    universityCode: s.university.code,
    streamName: s.name,
    degreeType: s.degreeType,
    totalSeats: s.totalSeats,
    filledSeats: s.filledSeats,
    availableSeats: availableSeats(s),
  }));

  const rows =
    type === "available"
      ? mapped.filter((r) => r.availableSeats > 0)
      : mapped.filter((r) => r.filledSeats > 0);

  const totalSeats = mapped.reduce((n, r) => n + r.totalSeats, 0);
  const totalFilled = mapped.reduce((n, r) => n + r.filledSeats, 0);

  return {
    rows,
    totalSeats,
    totalFilled,
    totalAvailable: Math.max(0, totalSeats - totalFilled),
  };
}
