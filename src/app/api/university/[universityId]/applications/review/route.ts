import { AdmissionReviewStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessUniversityScope } from "@/lib/university-scope";

const patchSchema = z.object({
  applicationId: z.string().min(1),
  admissionReview: z.nativeEnum(AdmissionReviewStatus),
});

type RouteContext = { params: Promise<{ universityId: string }> };

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { universityId } = await ctx.params;
  if (!canAccessUniversityScope(session, universityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const app = await prisma.application.findFirst({
    where: { id: parsed.data.applicationId, universityId },
  });
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const updated = await prisma.application.update({
    where: { id: app.id },
    data: { admissionReview: parsed.data.admissionReview },
  });

  return NextResponse.json({ application: updated });
}
