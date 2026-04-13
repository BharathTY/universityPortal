import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessUniversityScope } from "@/lib/university-scope";

const createSchema = z.object({
  label: z.string().min(2).max(32).trim(),
  sortOrder: z.number().int().optional(),
});

type RouteContext = { params: Promise<{ universityId: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { universityId } = await ctx.params;
  if (!canAccessUniversityScope(session, universityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.academicYear.findMany({
    where: { universityId },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return NextResponse.json({ academicYears: rows });
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { universityId } = await ctx.params;
  if (!canAccessUniversityScope(session, universityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const maxOrder = await prisma.academicYear.aggregate({
    where: { universityId },
    _max: { sortOrder: true },
  });
  const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;

  try {
    const row = await prisma.academicYear.create({
      data: {
        universityId,
        label: parsed.data.label,
        sortOrder,
      },
    });
    return NextResponse.json({ academicYear: row });
  } catch {
    return NextResponse.json({ error: "Could not create (duplicate year?)" }, { status: 409 });
  }
}
