import { NextResponse } from "next/server";
import { requireMasterApi } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";
import {
  isUniversityEmailAvailable,
  UNIVERSITY_EMAIL_IN_USE_MESSAGE,
} from "@/lib/university-primary-user";

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/** GET ?email=&excludeUniversityId= — check university email uniqueness before wizard step advance. */
export async function GET(req: Request) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim();
  const excludeUniversityId =
    (url.searchParams.get("excludeUniversityId") ?? "").trim() || undefined;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!looksLikeEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  let currentUniversityEmail: string | null = null;
  if (excludeUniversityId) {
    const uni = await prisma.university.findUnique({
      where: { id: excludeUniversityId },
      select: { email: true },
    });
    if (!uni) {
      return NextResponse.json({ error: "University not found" }, { status: 404 });
    }
    currentUniversityEmail = uni.email;
  }

  const available = await isUniversityEmailAvailable(email, {
    excludeUniversityId,
    currentUniversityEmail,
  });

  if (!available) {
    return NextResponse.json(
      {
        available: false,
        error: UNIVERSITY_EMAIL_IN_USE_MESSAGE,
        fieldErrors: { email: [UNIVERSITY_EMAIL_IN_USE_MESSAGE] },
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ available: true });
}
