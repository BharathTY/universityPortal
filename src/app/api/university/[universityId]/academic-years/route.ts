import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly } from "@/lib/roles";
import {
  isSelectableYopYearLabel,
  maxSelectableYopYearLabel,
  minSelectableYopYearLabel,
  normalizeAcademicYearLabel,
  parseAcademicYearStartYear,
} from "@/lib/academic-year-yop";
import { canAccessUniversityScopeAsync } from "@/lib/university-scope";

const createSchema = z.object({
  /** Academic year label e.g. 2026/27 */
  label: z
    .string()
    .trim()
    .min(1, "Enter a valid academic year")
    .refine((s) => isSelectableYopYearLabel(s), {
      message: `Year must be between ${minSelectableYopYearLabel()} and ${maxSelectableYopYearLabel()} (past years are not allowed)`,
    })
    .transform((s) => normalizeAcademicYearLabel(s)!),
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
  const startYear = parseAcademicYearStartYear(parsed.data.label) ?? (maxOrder._max.sortOrder ?? 0) + 1;

  try {
    const row = await prisma.academicYear.create({
      data: {
        universityId,
        label: parsed.data.label,
        sortOrder: parsed.data.sortOrder ?? startYear,
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
