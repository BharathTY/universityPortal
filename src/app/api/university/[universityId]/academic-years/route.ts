import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly } from "@/lib/roles";
import { isSelectableYopYear, maxSelectableYopYear, minSelectableYopYear } from "@/lib/academic-year-yop";
import { canAccessUniversityScopeAsync } from "@/lib/university-scope";

const createSchema = z.object({
  /** Four-digit calendar year only (e.g. 2027), stored as label for filtering and display. */
  label: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter a valid year using four digits")
    .refine((s) => isSelectableYopYear(Number(s)), {
      message: `Year must be between ${minSelectableYopYear()} and ${maxSelectableYopYear()} (past years are not allowed)`,
    }),
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
  if (!(await canAccessUniversityScopeAsync(session, universityId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isConsultantOnly(session.roles)) {
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
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
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
    return NextResponse.json(
      { error: `Academic year ${parsed.data.label} already exists for this university` },
      { status: 409 },
    );
  }
}
