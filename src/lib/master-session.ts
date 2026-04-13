import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isMaster } from "@/lib/roles";

export async function requireMasterApi(): Promise<
  { ok: true; session: NonNullable<Awaited<ReturnType<typeof getSession>>> } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isMaster(session.roles)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session };
}
