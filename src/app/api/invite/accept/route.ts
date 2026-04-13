import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  token: z.string().min(10),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const token = parsed.data.token.trim();

  const user = await prisma.user.findUnique({
    where: { inviteToken: token },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      inviteToken: null,
      inviteAcceptedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, email: user.email });
}
