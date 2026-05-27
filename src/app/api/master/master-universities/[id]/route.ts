import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMasterApi } from "@/lib/master-session";

type RouteContext = { params: Promise<{ id: string }> };

/** Fetch one master catalog university by id. */
export async function GET(_req: Request, context: RouteContext) {
  const auth = await requireMasterApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const item = await prisma.masterUniversity.findUnique({
    where: { id },
    select: {
      id: true,
      externalId: true,
      name: true,
      shortname: true,
      state: true,
      stateCode: true,
      district: true,
      address: true,
      city: true,
      pincode: true,
      website: true,
      universityType: true,
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}
