import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultant, isConsultantOnly } from "@/lib/roles";

/**
 * Streams + labels for a university the consultant may access (embed leads on hub).
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !isConsultant(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const requested = url.searchParams.get("universityId")?.trim();
  const allowed = await getAllowedConsultantUniversityIds(session.sub);
  if (allowed.length === 0) {
    return NextResponse.json({ error: "No universities assigned" }, { status: 400 });
  }

  const universityId = requested && allowed.includes(requested) ? requested : allowed[0]!;

  const uniRows = await prisma.university.findMany({
    where: { id: { in: allowed } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, logoUrl: true },
  });

  const [university, streams] = await Promise.all([
    prisma.university.findUnique({
      where: { id: universityId },
      select: { id: true, name: true, code: true },
    }),
    prisma.stream.findMany({
      where: { universityId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  if (!university) {
    return NextResponse.json({ error: "University not found" }, { status: 404 });
  }

  return NextResponse.json({
    universityId: university.id,
    universityName: university.name,
    universityCode: university.code,
    streams,
    allowedUniversityIds: allowed,
    universities: uniRows,
    defaultUniversityId: allowed[0] ?? null,
    isConsultantOnly: isConsultantOnly(session.roles),
  });
}
