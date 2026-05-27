import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildFeesPayload, getStudentApplication } from "@/lib/student-application-data";
import { isStudent } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const applicationId = url.searchParams.get("applicationId");

  const application = await getStudentApplication(session.sub, applicationId);
  if (!application) {
    return NextResponse.json({ error: "No application found" }, { status: 404 });
  }

  return NextResponse.json(buildFeesPayload(application));
}
