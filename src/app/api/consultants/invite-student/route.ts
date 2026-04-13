import { handleInviteStudentRequest } from "@/lib/invite-student-server";

export async function POST(req: Request) {
  return handleInviteStudentRequest(req);
}
