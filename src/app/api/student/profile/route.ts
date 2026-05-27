import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStudentApplication } from "@/lib/student-application-data";
import { formatDateOnly, isoToDateInputValue } from "@/lib/student-portal";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";

export async function GET() {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      name: true,
      email: true,
      phone: true,
      whatsappNumber: true,
      gender: true,
      dateOfBirth: true,
      stateStudent: true,
      districtStudent: true,
      pincode: true,
      pucType: true,
      pucInstitution: true,
      pucYear: true,
      pucPercent: true,
      ieltsScore: true,
      toeflScore: true,
      passportNumber: true,
      passportExpiry: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const application = await getStudentApplication(session.sub);

  return NextResponse.json({
    profile: {
      fullName: user.name ?? "—",
      email: user.email,
      mobile: user.phone ?? "—",
      whatsapp: user.whatsappNumber ?? "—",
      gender: user.gender ?? "—",
      dateOfBirth: formatDateOnly(user.dateOfBirth),
      state: user.stateStudent ?? application?.lead?.state ?? "—",
      district: user.districtStudent ?? application?.lead?.district ?? "—",
      pincode: user.pincode ?? application?.lead?.pincode ?? "—",
      pucType: user.pucType ?? "—",
      pucInstitution: user.pucInstitution ?? application?.lead?.pucBoard ?? "—",
      pucYear: user.pucYear ?? application?.lead?.pucYear ?? null,
      pucPercent: user.pucPercent?.toString() ?? application?.lead?.pucPercent?.toString() ?? "—",
      ieltsScore: user.ieltsScore ?? "—",
      toeflScore: user.toeflScore ?? "—",
      passportNumber: user.passportNumber ?? "—",
      passportExpiry: formatDateOnly(user.passportExpiry),
    },
  });
}
