import { handleInviteStudentRequest } from "@/lib/invite-student-server";

/** Same behaviour as POST /api/consultants/invite-student — explicit route for counsellor clients. */
export async function POST(req: Request) {
  return handleInviteStudentRequest(req);
}
