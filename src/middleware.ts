import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  canAccessLeadsAndBatches,
  isConsultant,
  isConsultantOnly,
  isMaster,
  isStudent,
  isUniversity,
} from "@/lib/roles";

const COOKIE_NAME = "UP_SESSION";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const rolesRaw = payload.roles;
    const roles = Array.isArray(rolesRaw) ? rolesRaw.map(String) : [];
    const path = request.nextUrl.pathname;

    const master = isMaster(roles);
    const university = isUniversity(roles);
    const consultant = isConsultant(roles);
    const consultantOnly = isConsultantOnly(roles);
    const leadsOk = canAccessLeadsAndBatches(roles);

    if (path.startsWith("/dashboard/master") && !master) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (path.startsWith("/dashboard/university")) {
      const uniStaff = university || (consultant && !isStudent(roles));
      if (!master && !uniStaff) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    if (path.startsWith("/dashboard/student") && !isStudent(roles)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const nonBatchLeadsPath =
      path.startsWith("/dashboard/applications") ||
      path.startsWith("/dashboard/submissions") ||
      path.startsWith("/dashboard/schemes") ||
      path.startsWith("/dashboard/coupons") ||
      path.startsWith("/dashboard/campaigns");

    if (nonBatchLeadsPath && consultantOnly) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const leadsPath =
      path.startsWith("/dashboard/batches") || nonBatchLeadsPath;

    if (leadsPath && !leadsOk) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (path.startsWith("/dashboard/consultant") && !leadsOk && !master && !university) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (path.startsWith("/dashboard/counsellor") && !consultant && !master && !university) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
