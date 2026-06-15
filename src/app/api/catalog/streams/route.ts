import { NextResponse } from "next/server";
import { listStreamSpecializations } from "@/lib/catalog-stream-specializations";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const universityExternalId = url.searchParams.get("universityExternalId")?.trim() || undefined;
  const degreeTypeExternalId = url.searchParams.get("degreeTypeExternalId")?.trim() || undefined;
  const items = await listStreamSpecializations({ universityExternalId, degreeTypeExternalId });
  return NextResponse.json({ items });
}
