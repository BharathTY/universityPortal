import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      sub: session.sub,
      email: session.email,
      roles: session.roles,
      universityId: session.universityId,
      studentOfId: session.studentOfId,
    },
  });
}
