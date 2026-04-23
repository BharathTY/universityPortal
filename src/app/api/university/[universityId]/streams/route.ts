import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessUniversityScopeAsync } from "@/lib/university-scope";

const createSchema = z.object({
  name: z.string().min(2).max(64).trim(),
  sortOrder: z.number().int().optional(),
});

type RouteContext = { params: Promise<{ universityId: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { universityId } = await ctx.params;
  if (!(await canAccessUniversityScopeAsync(session, universityId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.stream.findMany({
    where: { universityId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ streams: rows });
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { universityId } = await ctx.params;
  if (!(await canAccessUniversityScopeAsync(session, universityId))) {
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

  const maxOrder = await prisma.stream.aggregate({
    where: { universityId },
    _max: { sortOrder: true },
  });
  const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;

  try {
    const row = await prisma.stream.create({
      data: {
        universityId,
        name: parsed.data.name,
        sortOrder,
      },
    });
    return NextResponse.json({ stream: row });
  } catch {
    return NextResponse.json({ error: "Could not create (duplicate stream?)" }, { status: 409 });
  }
}
