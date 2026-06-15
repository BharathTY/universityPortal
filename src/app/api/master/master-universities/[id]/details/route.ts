import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMasterApi } from "@/lib/master-session";
import { resolveUniversityDetails } from "@/lib/university-details-api";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * University details for onboarding — fetched from the external API when configured,
 * otherwise populated from the local master catalog.
 *
 * Configure via UNIVERSITY_DETAILS_API_URL (supports `{id}` placeholder or `/base/{externalId}`).
 */
export async function GET(_req: Request, context: RouteContext) {
  const auth = await requireMasterApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const master = await prisma.masterUniversity.findUnique({
    where: { id },
    select: {
      id: true,
      externalId: true,
      name: true,
      state: true,
      district: true,
      address: true,
      city: true,
      pincode: true,
      website: true,
      universityType: true,
    },
  });

  if (!master) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const details = await resolveUniversityDetails(master);
  return NextResponse.json({ details });
}
