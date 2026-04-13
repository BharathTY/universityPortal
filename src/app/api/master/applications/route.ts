import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMasterApi } from "@/lib/master-session";

export async function GET(req: Request) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(url.searchParams.get("pageSize") ?? "25") || 25));

  const where = {};
  const skip = Math.max(0, (page - 1) * pageSize);

  const [total, applications] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        status: true,
        admissionReview: true,
        paymentStatus: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            studentOf: { select: { name: true, email: true } },
          },
        },
        university: { select: { id: true, name: true, code: true } },
        batch: { select: { title: true, code: true } },
        lead: {
          select: {
            stream: { select: { name: true } },
            createdBy: { select: { name: true, email: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    applications,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
