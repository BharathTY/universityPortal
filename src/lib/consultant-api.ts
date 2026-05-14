import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveScopedConsultantUniversityId } from "@/lib/consultant-universities";
import { prisma } from "@/lib/prisma";
import { isConsultant } from "@/lib/roles";

export async function requireConsultantUniversity(
  scopedUniversityId?: string | null,
): Promise<
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getSession>>>; universityId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isConsultant(session.roles)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const { universityId } = await resolveScopedConsultantUniversityId(session, scopedUniversityId);
  if (!universityId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Your account must be linked to at least one university. Ask a master admin to assign universities.",
        },
        { status: 400 },
      ),
    };
  }
  const uniActive = await prisma.university.findFirst({
    where: { id: universityId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!uniActive) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "This university is inactive. You cannot add or manage leads for it until a master admin reactivates it.",
        },
        { status: 403 },
      ),
    };
  }
  return { ok: true, session, universityId };
}
