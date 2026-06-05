import { NextResponse } from "next/server";
import { requireMasterApi } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/** Master admin: SPOC, program, and hostel summary for listing modals. */
export async function GET(_req: Request, context: RouteContext) {
  const auth = await requireMasterApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const university = await prisma.university.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      state: true,
      examFee: true,
      messFee: true,
      otherAdminCharges: true,
      otherAdminAmount: true,
      spocs: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          name: true,
          designation: true,
          mobile: true,
          email: true,
        },
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
          otherAdminCharges: true,
          otherAdminAmount: true,
        },
      },
      hostelFees: {
        orderBy: [{ gender: "asc" }, { roomType: "asc" }, { sharing: "asc" }],
        select: {
          gender: true,
          roomType: true,
          sharing: true,
          amount: true,
        },
      },
      cetSeats: {
        select: {
          programLevel: true,
          programName: true,
          streamName: true,
          allocationMode: true,
          allocationValue: true,
          seatCount: true,
        },
      },
      scholarships: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          type: true,
          value: true,
          criteria: true,
        },
      },
      _count: { select: { applications: true } },
    },
  });

  if (!university) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    spocs: university.spocs,
    programs: university.streams.map((s) => ({
      programLevel: s.programLevel,
      programName: s.degreeType,
      streamName: s.name,
      targetStudents: s.totalSeats,
      tuitionYear1: s.tuitionYear1?.toString() ?? null,
      tuitionTotal: s.tuitionTotal?.toString() ?? null,
      registrationFee: s.streamFee?.toString() ?? null,
      applicationFee: s.applicationFee?.toString() ?? null,
      examFee: s.examFee?.toString() ?? null,
      otherAdminCharges: s.otherAdminCharges,
      otherAdminAmount: s.otherAdminAmount?.toString() ?? null,
    })),
    cetSeats: university.cetSeats.map((c) => ({
      programLevel: c.programLevel,
      programName: c.programName,
      streamName: c.streamName,
      allocationMode: c.allocationMode,
      allocationValue: c.allocationValue?.toString() ?? null,
      seatCount: c.seatCount,
    })),
    scholarships: university.scholarships.map((s) => ({
      type: s.type,
      value: s.value.toString(),
      criteria: s.criteria,
    })),
    hostelFees: university.hostelFees.map((h) => ({
      gender: h.gender,
      roomType: h.roomType,
      sharing: h.sharing,
      amount: h.amount?.toString() ?? null,
    })),
    foodFee: university.messFee?.toString() ?? null,
    examFee: university.examFee?.toString() ?? null,
    otherAdminCharges: university.otherAdminCharges,
    otherAdminAmount: university.otherAdminAmount?.toString() ?? null,
    admissionsCount: university._count.applications,
  });
}
