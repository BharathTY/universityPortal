import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";

const patchSchema = z.object({
  firstName: z.string().min(1).max(120).optional(),
  lastName: z.string().min(1).max(120).optional(),
  phone: z.string().min(5).max(32).optional(),
  nationality: z.string().max(120).optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const application = await prisma.application.findFirst({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    include: {
      university: { select: { name: true, code: true } },
      user: { select: { name: true, phone: true } },
      lead: {
        include: {
          stream: { select: { name: true } },
          academicYear: { select: { label: true } },
        },
      },
    },
  });

  return NextResponse.json({ application });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !isStudent(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const application = await prisma.application.findFirst({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
  });
  if (!application) {
    return NextResponse.json({ error: "No application" }, { status: 404 });
  }

  const first = parsed.data.firstName;
  const last = parsed.data.lastName;
  const name =
    first || last
      ? [first ?? "", last ?? ""].map((s) => s.trim()).filter(Boolean).join(" ")
      : undefined;

  await prisma.user.update({
    where: { id: session.sub },
    data: {
      ...(name ? { name } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
    },
  });

  if (parsed.data.nationality !== undefined && application.leadId) {
    await prisma.admissionLead.update({
      where: { id: application.leadId },
      data: { nationality: parsed.data.nationality },
    });
  }

  return NextResponse.json({ ok: true });
}
