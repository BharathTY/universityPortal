import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  HOSTEL_FEE_COMBOS,
  hostelFeeAmountsFromDb,
  type HostelFeeKey,
} from "@/lib/hostel-fee-matrix";
import { requireMasterApi } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";
import { syncUniversityHostelFees } from "@/lib/university-hostel-fees-db";

const hostelFeeValue = z.union([z.number().nonnegative().max(999_999_999), z.null()]).optional();

const streamRowSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  degreeType: z.string().trim().max(120).optional().nullable(),
  streamFee: z.union([z.number().nonnegative().max(999_999_999), z.null()]).optional(),
});

const putSchema = z.object({
  location: z.string().trim().max(2000).optional().nullable(),
  streams: z.array(streamRowSchema).max(80),
  hostelFees: z
    .object(
      Object.fromEntries(
        HOSTEL_FEE_COMBOS.map((c) => [c.key, hostelFeeValue]),
      ) as Record<HostelFeeKey, typeof hostelFeeValue>,
    )
    .optional(),
});

function decimalToAmount(v: Prisma.Decimal | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v.toString());
  return Number.isFinite(n) ? n : null;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const u = await prisma.university.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      location: true,
      streams: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, degreeType: true, streamFee: true },
      },
      hostelFees: {
        select: { gender: true, roomType: true, sharing: true, amount: true },
      },
    },
  });

  if (!u) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    universityId: u.id,
    name: u.name,
    location: u.location ?? "",
    streams: u.streams.map((s) => ({
      id: s.id,
      name: s.name,
      degreeType: s.degreeType ?? "",
      streamFee: decimalToAmount(s.streamFee),
    })),
    hostelFees: hostelFeeAmountsFromDb(u.hostelFees),
  });
}

export async function PUT(req: Request, ctx: RouteContext) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const uni = await prisma.university.findUnique({ where: { id }, select: { id: true } });
  if (!uni) {
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

  const nameKeys = parsed.data.streams.map((s) => s.name.trim().toLowerCase());
  if (new Set(nameKeys).size !== nameKeys.length) {
    return NextResponse.json({ error: "Duplicate stream names in the form" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.location !== undefined) {
        await tx.university.update({
          where: { id },
          data: {
            location:
              parsed.data.location === null || parsed.data.location.trim() === ""
                ? null
                : parsed.data.location.trim(),
          },
        });
      }

      const sortAgg = await tx.stream.aggregate({
        where: { universityId: id },
        _max: { sortOrder: true },
      });
      let nextOrder = (sortAgg._max.sortOrder ?? -1) + 1;

      for (const s of parsed.data.streams) {
        const name = s.name.trim();
        const degreeType = s.degreeType?.trim() || null;
        const fee =
          s.streamFee === undefined || s.streamFee === null
            ? null
            : new Prisma.Decimal(Number(s.streamFee).toFixed(2));

        if (s.id) {
          const existing = await tx.stream.findFirst({
            where: { id: s.id, universityId: id },
            select: { id: true },
          });
          if (!existing) {
            throw new Error("Stream not found for this university");
          }
          const clash = await tx.stream.findFirst({
            where: { universityId: id, name, NOT: { id: s.id } },
            select: { id: true },
          });
          if (clash) {
            throw new Error(`Another stream already uses the name "${name}"`);
          }
          await tx.stream.update({
            where: { id: s.id },
            data: { name, degreeType, streamFee: fee },
          });
        } else {
          try {
            await tx.stream.create({
              data: {
                universityId: id,
                name,
                degreeType,
                streamFee: fee,
                sortOrder: nextOrder++,
              },
            });
          } catch {
            throw new Error(`Could not add stream "${name}" (duplicate name?)`);
          }
        }
      }

      if (parsed.data.hostelFees) {
        await syncUniversityHostelFees(tx, id, parsed.data.hostelFees);
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save";
    const status = msg.includes("not found") ? 404 : msg.includes("duplicate") ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ ok: true });
}
