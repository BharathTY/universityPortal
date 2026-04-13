import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessLeadsAndBatches } from "@/lib/roles";
import { getManagedStudentOrNull } from "@/lib/managed-student-access";

const patchSchema = z.object({
  name: z.string().trim().max(120).optional().nullable(),
});

export async function PATCH(req: Request, context: { params: Promise<{ userId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessLeadsAndBatches(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  const existing = await getManagedStudentOrNull(userId, session);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const name =
    parsed.data.name === undefined ? undefined : parsed.data.name === null || parsed.data.name === ""
      ? null
      : parsed.data.name;

  await prisma.user.update({
    where: { id: existing.id },
    data: { ...(name !== undefined ? { name } : {}) },
  });

  return NextResponse.json({ ok: true });
}
