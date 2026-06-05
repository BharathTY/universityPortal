import { DocumentKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { replaceConsultantUniversityAssignments } from "@/lib/consultant-universities";
import { storeUpload } from "@/lib/file-storage";
import { validateGstNumber, validatePanNumber, normalizeGstNumber, normalizePanNumber } from "@/lib/indian-tax-ids";
import { requireMasterApi } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";

const consultantPhoneSchema = z
  .string()
  .transform((raw) => raw.trim())
  .superRefine((s, ctx) => {
    if (s.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Phone number is required" });
      return;
    }
    if (!/^\d+$/.test(s)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only numbers are allowed" });
      return;
    }
    if (s.length !== 10) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Phone number must be 10 digits" });
    }
  });

const optionalText = (max: number) =>
  z.preprocess((v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === "string" && v.trim() === "") return undefined;
    return typeof v === "string" ? v.trim() : v;
  }, z.string().max(max).optional());

const patchSchema = z
  .object({
    name: z.string().min(2).max(200).trim().optional(),
    email: z.string().email().max(254).trim().optional(),
    phone: consultantPhoneSchema.optional(),
    universityIds: z.array(z.string().min(1)).optional(),
    accountStatus: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    companyName: optionalText(200),
    designation: optionalText(120),
    gstNumber: optionalText(20),
    panNumber: optionalText(20),
    address: optionalText(2000),
    city: optionalText(120),
    district: optionalText(120),
    state: optionalText(120),
    academicYear: optionalText(10),
  })
  .superRefine((data, ctx) => {
    const gstErr = validateGstNumber(data.gstNumber ?? "");
    if (gstErr) ctx.addIssue({ code: z.ZodIssueCode.custom, message: gstErr, path: ["gstNumber"] });
    const panErr = validatePanNumber(data.panNumber ?? "");
    if (panErr) ctx.addIssue({ code: z.ZodIssueCode.custom, message: panErr, path: ["panNumber"] });
  });

type RouteContext = { params: Promise<{ id: string }> };

async function parsePatchRequest(req: Request): Promise<{ data: unknown; mouFile?: File }> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const payloadRaw = form.get("payload");
    const mouRaw = form.get("mouFile");
    return {
      data: JSON.parse(typeof payloadRaw === "string" ? payloadRaw : "{}") as unknown,
      mouFile: mouRaw instanceof File && mouRaw.size > 0 ? mouRaw : undefined,
    };
  }
  return { data: await req.json() };
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  let json: unknown;
  let mouFile: File | undefined;
  try {
    const parsedReq = await parsePatchRequest(req);
    json = parsedReq.data;
    mouFile = parsedReq.mouFile;
  } catch {
    return NextResponse.json({ error: "Invalid JSON or form data" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return NextResponse.json({ error: "Invalid input", fieldErrors: flat.fieldErrors }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (mouFile && !parsed.data.academicYear) {
    return NextResponse.json(
      { error: "Academic year is required when uploading MOU", fieldErrors: { academicYear: ["Required for MOU"] } },
      { status: 400 },
    );
  }

  const email = parsed.data.email?.toLowerCase().trim();
  if (email && email !== user.email) {
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash) {
      return NextResponse.json(
        { error: "Email already exists", fieldErrors: { email: ["Email already exists"] } },
        { status: 409 },
      );
    }
  }

  if (parsed.data.universityIds !== undefined) {
    const ids = [...new Set(parsed.data.universityIds)];
    if (ids.length === 0) {
      return NextResponse.json({ error: "Please select at least one university" }, { status: 400 });
    }
    const count = await prisma.university.count({
      where: { id: { in: ids }, status: "ACTIVE" },
    });
    if (count !== ids.length) {
      return NextResponse.json(
        { error: "One or more universities are invalid or inactive" },
        { status: 400 },
      );
    }
    await replaceConsultantUniversityAssignments(id, ids);
  }

  if (mouFile) {
    try {
      const mouDoc = await storeUpload(mouFile, "consultants/mou", "mou");
      await prisma.consultantDocument.create({
        data: {
          userId: id,
          kind: DocumentKind.MOU,
          fileName: mouDoc.fileName,
          fileUrl: mouDoc.fileUrl,
          academicYear: parsed.data.academicYear!,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "MOU upload failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.accountStatus !== undefined ? { accountStatus: parsed.data.accountStatus } : {}),
      ...(parsed.data.companyName !== undefined ? { companyName: parsed.data.companyName ?? null } : {}),
      ...(parsed.data.designation !== undefined ? { designation: parsed.data.designation ?? null } : {}),
      ...(parsed.data.gstNumber !== undefined
        ? { gstNumber: parsed.data.gstNumber ? normalizeGstNumber(parsed.data.gstNumber) : null }
        : {}),
      ...(parsed.data.panNumber !== undefined
        ? { panNumber: parsed.data.panNumber ? normalizePanNumber(parsed.data.panNumber) : null }
        : {}),
      ...(parsed.data.address !== undefined ? { address: parsed.data.address ?? null } : {}),
      ...(parsed.data.city !== undefined ? { city: parsed.data.city ?? null } : {}),
      ...(parsed.data.district !== undefined ? { district: parsed.data.district ?? null } : {}),
      ...(parsed.data.state !== undefined ? { state: parsed.data.state ?? null } : {}),
      ...(parsed.data.academicYear !== undefined ? { academicYear: parsed.data.academicYear ?? null } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { accountStatus: "INACTIVE" },
  });

  return NextResponse.json({ ok: true });
}
