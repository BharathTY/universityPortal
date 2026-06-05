import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function findActiveUniversity(universityId: string) {
  return prisma.university.findFirst({
    where: { id: universityId, status: "ACTIVE" },
    select: { id: true, name: true },
  });
}

export async function requireActiveUniversity(universityId: string): Promise<
  | { ok: true; university: { id: string; name: string } }
  | { ok: false; response: NextResponse }
> {
  const university = await findActiveUniversity(universityId);
  if (!university) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "This university is inactive. New admissions and applications are not accepted until a master admin reactivates it.",
        },
        { status: 403 },
      ),
    };
  }
  return { ok: true, university };
}
