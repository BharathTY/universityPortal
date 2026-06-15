import { DocumentKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireMasterApi } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";
import {
  hostelEntryLabel,
  mouTenureFromEnum,
  scholarshipTypeLabel,
  type UniversityProfileView,
} from "@/lib/university-profile-view";

type RouteContext = { params: Promise<{ id: string }> };

function decimalToString(value: { toString(): string } | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

/** Master admin: full read-only university profile for list view slider. */
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
      status: true,
      createdAt: true,
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
      targetStudents: true,
      messFee: true,
      mouYear: true,
      mouTenure: true,
      mouFileUrl: true,
      eventPhotoUrls: true,
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
          name: true,
          degreeType: true,
          programLevel: true,
          totalSeats: true,
          tuitionYear1: true,
          tuitionTotal: true,
          streamFee: true,
          applicationFee: true,
          examFee: true,
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
        orderBy: [{ gender: "asc" }, { roomType: "asc" }, { sharing: "asc" }],
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
      _count: { select: { applications: true } },
    },
  });

  if (!university) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cetByStream = new Map<string, (typeof university.cetSeats)[number]>();
  for (const seat of university.cetSeats) {
    const key = `${seat.programLevel ?? ""}|${seat.programName ?? ""}|${seat.streamName}`;
    cetByStream.set(key, seat);
  }

  const programs = university.streams.map((stream) => {
    const key = `${stream.programLevel ?? ""}|${stream.degreeType ?? ""}|${stream.name}`;
    const cet = cetByStream.get(key);
    return {
      programLevel: stream.programLevel,
      programName: stream.degreeType,
      streamName: stream.name,
      targetStudents: stream.totalSeats,
      tuitionYear1: decimalToString(stream.tuitionYear1),
      tuitionTotal: decimalToString(stream.tuitionTotal),
      registrationFee: decimalToString(stream.streamFee),
      applicationFee: decimalToString(stream.applicationFee),
      examFee: decimalToString(stream.examFee),
      otherAdminAmount: decimalToString(stream.otherAdminAmount),
      cetAllocationMode: cet?.allocationMode ?? null,
      cetAllocationValue: decimalToString(cet?.allocationValue),
    };
  });

  const hostelEntries = university.hostelFees
    .filter((row) => row.amount != null && Number(row.amount.toString()) > 0)
    .map((row) => ({
      label: hostelEntryLabel(row.gender, row.roomType, row.sharing),
      feePerYear: row.amount!.toString(),
    }));

  const mouDocuments = university.documents
    .filter((doc) => doc.kind === DocumentKind.MOU)
    .map((doc) => ({ fileName: doc.fileName, fileUrl: doc.fileUrl }));

  if (university.mouFileUrl && !mouDocuments.some((doc) => doc.fileUrl === university.mouFileUrl)) {
    mouDocuments.unshift({ fileName: "MOU document", fileUrl: university.mouFileUrl });
  }

  const eventPhotosFromDocs = university.documents
    .filter((doc) => doc.kind === DocumentKind.EVENT_PHOTO)
    .map((doc) => ({ fileName: doc.fileName, fileUrl: doc.fileUrl }));

  const eventPhotos = eventPhotosFromDocs.length
    ? eventPhotosFromDocs
    : university.eventPhotoUrls.map((url, index) => ({
        fileName: `Event photo ${index + 1}`,
        fileUrl: url,
      }));

  const profile: UniversityProfileView = {
    id: university.id,
    code: university.code,
    name: university.name,
    status: university.status,
    createdAt: university.createdAt.toISOString(),
    details: {
      location: university.location,
      state: university.state,
      district: university.district,
      city: university.city,
      area: university.area,
      pincode: university.pincode,
      website: university.website,
      universityType: university.universityType,
      email: university.email,
      phone: university.phone,
      logoUrl: university.logoUrl,
      targetStudents: university.targetStudents,
    },
    spocs: university.spocs,
    programs,
    hostel: {
      available: hostelEntries.length > 0,
      mouYear: university.mouYear,
      mouTenure: mouTenureFromEnum(university.mouTenure),
      foodFee: decimalToString(university.messFee),
      entries: hostelEntries,
    },
    scholarships: university.scholarships.map((scholarship) => ({
      type: scholarship.type,
      typeLabel: scholarshipTypeLabel(scholarship.type),
      value: scholarship.value.toString(),
    })),
    mou: {
      year: university.mouYear,
      tenure: mouTenureFromEnum(university.mouTenure),
      documents: mouDocuments,
      eventPhotos,
    },
    mouSpocs: university.mouSpocs,
    admissionsCount: university._count.applications,
  };

  return NextResponse.json(profile);
}
