import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveConsultantActiveUniversityId } from "@/lib/consultant-universities";
import { isConsultant } from "@/lib/roles";

export async function requireConsultantUniversity(): Promise<
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
  const { universityId } = await resolveConsultantActiveUniversityId(session);
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
  return { ok: true, session, universityId };
}
