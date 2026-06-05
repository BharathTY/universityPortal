import {
  CetAllocationMode,
  Prisma,
  ProgramLevel,
  ScholarshipType,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMasterApi } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";

const scholarshipItemSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(ScholarshipType),
  value: z.coerce.number().positive().max(999_999_999),
  criteria: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

const cetSeatItemSchema = z.object({
  id: z.string().optional(),
  programLevel: z.enum(["UG", "PG"]),
  programName: z.string().trim().max(120).optional().nullable(),
  streamName: z.string().trim().min(1).max(200),
  allocationMode: z.enum(["SEATS", "PERCENT"]).default("SEATS"),
  allocationValue: z.coerce.number().nonnegative().max(999_999),
});

const putSchema = z.object({
  scholarships: z.array(scholarshipItemSchema).max(20).optional(),
  cetSeats: z.array(cetSeatItemSchema).max(80).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

function toDecimal(v: number | null | undefined): Prisma.Decimal | null {
  if (v === null || v === undefined) return null;
  return new Prisma.Decimal(Number(v).toFixed(2));
}

export async function GET(_req: Request, ctx: RouteContext) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const uni = await prisma.university.findUnique({
    where: { id },
    select: {
      scholarships: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, type: true, value: true, criteria: true, sortOrder: true },
      },
      cetSeats: {
        orderBy: [{ programLevel: "asc" }, { streamName: "asc" }],
        select: {
          id: true,
          programLevel: true,
          programName: true,
          streamName: true,
          allocationMode: true,
          allocationValue: true,
          seatCount: true,
        },
      },
    },
  });

  if (!uni) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    scholarships: uni.scholarships.map((s) => ({
      id: s.id,
      type: s.type,
      value: Number(String(s.value)),
      criteria: s.criteria,
      sortOrder: s.sortOrder,
    })),
    cetSeats: uni.cetSeats.map((c) => ({
      id: c.id,
      programLevel: c.programLevel,
      programName: c.programName,
      streamName: c.streamName,
      allocationMode: c.allocationMode,
      allocationValue: c.allocationValue != null ? Number(String(c.allocationValue)) : null,
      seatCount: c.seatCount,
    })),
  });
}

export async function PUT(req: Request, ctx: RouteContext) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const exists = await prisma.university.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (parsed.data.scholarships !== undefined) {
      await tx.universityScholarship.deleteMany({ where: { universityId: id } });
      for (let i = 0; i < parsed.data.scholarships.length; i++) {
        const s = parsed.data.scholarships[i]!;
        await tx.universityScholarship.create({
          data: {
            universityId: id,
            type: s.type,
            value: toDecimal(s.value)!,
            criteria: s.criteria,
            sortOrder: s.sortOrder ?? i,
          },
        });
      }
    }

    if (parsed.data.cetSeats !== undefined) {
      await tx.universityCetSeat.deleteMany({ where: { universityId: id } });
      for (const seat of parsed.data.cetSeats) {
        const mode =
          seat.allocationMode === "PERCENT" ? CetAllocationMode.PERCENT : CetAllocationMode.SEATS;
        const value = seat.allocationValue;
        await tx.universityCetSeat.create({
          data: {
            universityId: id,
            programLevel: seat.programLevel as ProgramLevel,
            programName: seat.programName?.trim() || null,
            streamName: seat.streamName,
            allocationMode: mode,
            allocationValue: toDecimal(value),
            seatCount: mode === CetAllocationMode.SEATS ? Math.round(value) : 0,
          },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
