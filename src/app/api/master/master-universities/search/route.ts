import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMasterApi } from "@/lib/master-session";

/** Search master university list (§4.2 step 1). */
export async function GET(req: Request) {
  const auth = await requireMasterApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);

  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const items = await prisma.masterUniversity.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { shortname: { contains: q, mode: "insensitive" } },
        { district: { contains: q, mode: "insensitive" } },
        { state: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ priority: "desc" }, { name: "asc" }],
    take: limit,
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

  return NextResponse.json({ items });
}
