import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { COOKIE_NAME, createSessionToken, getSession } from "@/lib/auth";
import { assertConsultantUniversityMembership } from "@/lib/consultant-universities";
import { isConsultant } from "@/lib/roles";

const schema = z.object({
  universityId: z.string().min(1),
});

/** Sets the active university in the session for consultants with multiple assignments. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isConsultant(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { universityId } = parsed.data;
  const allowed = await assertConsultantUniversityMembership(session.sub, universityId);
  if (!allowed) {
    return NextResponse.json({ error: "University not assigned to your account" }, { status: 403 });
  }

  const token = await createSessionToken({
    sub: session.sub,
    email: session.email,
    roles: session.roles,
    universityId,
    studentOfId: session.studentOfId,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true, universityId });
}
