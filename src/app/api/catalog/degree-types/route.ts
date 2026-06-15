import { NextResponse } from "next/server";
import { listDegreeTypes } from "@/lib/catalog-degree-types";

export async function GET() {
  const items = await listDegreeTypes();
  return NextResponse.json({ items });
}
