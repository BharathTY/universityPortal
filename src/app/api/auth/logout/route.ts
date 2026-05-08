import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, buildSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", buildSessionCookieOptions(0));
  return NextResponse.json({ ok: true });
}
