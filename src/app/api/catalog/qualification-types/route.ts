import { NextResponse } from "next/server";
import { listQualificationTypes } from "@/lib/catalog-qualification-types";

export async function GET() {
  const items = await listQualificationTypes();
  return NextResponse.json({ items });
}
