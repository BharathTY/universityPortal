import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { storeUpload } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const applicationId = form.get("applicationId");
  const photoFile = form.get("photoFile");

  if (typeof applicationId !== "string" || !(photoFile instanceof File) || photoFile.size === 0) {
    return NextResponse.json({ error: "Missing applicationId or photoFile" }, { status: 400 });
  }

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: session.sub },
    select: { leadId: true },
  });
  if (!application?.leadId) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  try {
    const stored = await storeUpload(photoFile, "students/photos", "image");
    await prisma.admissionLead.update({
      where: { id: application.leadId },
      data: { photoUrl: stored.fileUrl },
    });
    return NextResponse.json({ photoUrl: stored.fileUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Photo upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
