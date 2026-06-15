import { NextResponse } from "next/server";
import {
  degreeTypesForQualification,
  resolveProgramCatalog,
  streamsForDegreeType,
} from "@/lib/qspiders-program-catalog";

/** Full program catalog for onboarding (qualification → degree → stream). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const qualificationType = url.searchParams.get("qualificationType")?.trim().toUpperCase() ?? "";
  const degreeType = url.searchParams.get("degreeType")?.trim() ?? "";

  const catalog = await resolveProgramCatalog();

  if (qualificationType && degreeType) {
    return NextResponse.json({
      source: catalog.source,
      items: streamsForDegreeType(catalog, qualificationType, degreeType),
    });
  }

  if (qualificationType) {
    return NextResponse.json({
      source: catalog.source,
      items: degreeTypesForQualification(catalog, qualificationType),
    });
  }

  return NextResponse.json(catalog);
}
