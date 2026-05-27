import type { Stream } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";

export type SeatSummary = {
  total: number;
  filled: number;
  remaining: number;
};

type StreamSeatFields = Pick<Stream, "totalSeats" | "filledSeats">;

/** Remaining seats on a single stream row. */
export function availableSeats(stream: StreamSeatFields): number {
  return Math.max(0, stream.totalSeats - stream.filledSeats);
}

function aggregateSeatRows(streams: StreamSeatFields[]): SeatSummary {
  const total = streams.reduce((sum, s) => sum + s.totalSeats, 0);
  const filled = streams.reduce((sum, s) => sum + s.filledSeats, 0);
  return { total, filled, remaining: Math.max(0, total - filled) };
}

/** Sum seat capacity across all streams for one university. */
export async function aggregateSeatsForUniversity(universityId: string): Promise<SeatSummary> {
  const streams = await prisma.stream.findMany({
    where: { universityId },
    select: { totalSeats: true, filledSeats: true },
  });
  return aggregateSeatRows(streams);
}

/** Sum seat capacity across streams for all active universities assigned to a consultant. */
export async function aggregateSeatsForConsultant(userId: string): Promise<SeatSummary> {
  const universityIds = await getAllowedConsultantUniversityIds(userId);
  if (universityIds.length === 0) {
    return { total: 0, filled: 0, remaining: 0 };
  }
  const streams = await prisma.stream.findMany({
    where: { universityId: { in: universityIds } },
    select: { totalSeats: true, filledSeats: true },
  });
  return aggregateSeatRows(streams);
}
