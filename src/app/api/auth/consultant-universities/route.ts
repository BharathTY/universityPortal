import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";
import { isConsultant } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

/** Lists universities assigned to the current consultant (for multi-university switching). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isConsultant(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ids = await getAllowedConsultantUniversityIds(session.sub);
  if (ids.length === 0) {
    return NextResponse.json({ universities: [], activeId: session.universityId });
  }

  const universities = await prisma.university.findMany({
    where: { id: { in: ids } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, logoUrl: true },
  });

  return NextResponse.json({
    universities,
    activeId: session.universityId,
  });
}
