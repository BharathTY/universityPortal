import { DocumentKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireMasterApi } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";
import { buildUniversityEditWizardData } from "@/lib/university-edit-wizard-data";

type RouteContext = { params: Promise<{ id: string }> };

/** Master admin: wizard-shaped data for editing a university. */
export async function GET(_req: Request, context: RouteContext) {
  const auth = await requireMasterApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const university = await prisma.university.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      masterUniversityId: true,
      location: true,
      state: true,
      district: true,
      city: true,
      area: true,
      pincode: true,
      website: true,
      universityType: true,
      email: true,
      phone: true,
      logoUrl: true,
      messFee: true,
      mouYear: true,
      mouTenure: true,
      mouFileUrl: true,
      eventPhotoUrls: true,
      targetStudents: true,
      spocs: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { name: true, designation: true, mobile: true, email: true },
      },
      mouSpocs: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { name: true, designation: true, mobile: true, email: true },
      },
      streams: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          degreeType: true,
          programLevel: true,
          totalSeats: true,
          tuitionYear1: true,
          tuitionTotal: true,
          streamFee: true,
          applicationFee: true,
          examFee: true,
          otherAdminCharges: true,
          otherAdminAmount: true,
        },
      },
      cetSeats: {
        select: {
          programLevel: true,
          programName: true,
          streamName: true,
          allocationMode: true,
          allocationValue: true,
        },
      },
      hostelFees: {
        select: { gender: true, roomType: true, sharing: true, amount: true },
      },
      scholarships: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { type: true, value: true },
      },
      documents: {
        orderBy: [{ uploadedAt: "asc" }],
        select: { kind: true, fileName: true, fileUrl: true },
      },
    },
  });

  if (!university) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(buildUniversityEditWizardData({ university }));
}
