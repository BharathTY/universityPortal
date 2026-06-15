import { DocumentKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendConsultantAccountCreatedEmail, sendCounsellorPortalInviteEmail } from "@/lib/email";
import { storeUpload } from "@/lib/file-storage";
import { requireMasterApi } from "@/lib/master-session";
import { validateGstNumber, validatePanNumber, normalizeGstNumber, normalizePanNumber } from "@/lib/indian-tax-ids";
import { prisma } from "@/lib/prisma";
import { replaceConsultantUniversityAssignments } from "@/lib/consultant-universities";
import { buildAccountActivationUrl, generateInviteToken } from "@/lib/student-invite";
import { ROLES } from "@/lib/roles";

const consultantNameSchema = z
  .string()
  .transform((raw) => raw.trim())
  .superRefine((s, ctx) => {
    if (s.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Name is required" });
      return;
    }
    if (!/^[\p{L} ]+$/u.test(s)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Name must contain only letters." });
      return;
    }
    if (s.length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Name must be at least 3 characters" });
    }
  });

const consultantEmailSchema = z
  .string()
  .transform((raw) => raw.trim())
  .superRefine((s, ctx) => {
    if (s.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Email is required" });
      return;
    }
    if (!z.string().email().safeParse(s).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid email address" });
    }
  });

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

const optionalPhone10 = z.preprocess((v) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return typeof v === "string" ? v.trim() : v;
}, z.string().optional());

const spocItemSchema = z.object({
  name: consultantNameSchema,
  email: consultantEmailSchema,
  phone: consultantPhoneSchema,
  whatsapp: optionalPhone10,
  designation: optionalText(120),
});

const createSchema = z.object({
  name: consultantNameSchema,
  email: consultantEmailSchema,
  phone: consultantPhoneSchema,
  universityIds: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.string().min(1)).min(1, { message: "Please select at least one university" }),
  ),
  partnerRole: z.enum(["consultant", "qspiders_branch"]).optional(),
  branchName: z.string().max(120).optional().nullable(),
  companyName: optionalText(200),
  designation: optionalText(120),
  gstNumber: optionalText(20),
  panNumber: optionalText(20),
  address: optionalText(2000),
  city: optionalText(120),
  district: optionalText(120),
  state: optionalText(120),
  academicYear: optionalText(10),
  spocs: z.array(spocItemSchema).max(20).optional(),
  /** @deprecated use spocs */
  spoc: spocItemSchema.optional(),
}).superRefine((data, ctx) => {
  const gstErr = validateGstNumber(data.gstNumber ?? "");
  if (gstErr) ctx.addIssue({ code: z.ZodIssueCode.custom, message: gstErr, path: ["gstNumber"] });
  const panErr = validatePanNumber(data.panNumber ?? "");
  if (panErr) ctx.addIssue({ code: z.ZodIssueCode.custom, message: panErr, path: ["panNumber"] });
});

async function parseConsultantRequest(req: Request): Promise<{ data: unknown; mouFile?: File }> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new Error("Invalid form data");
    }
    const payloadRaw = form.get("payload");
    let data: unknown;
    try {
      data = JSON.parse(typeof payloadRaw === "string" ? payloadRaw : "{}");
    } catch {
      throw new Error("Invalid payload JSON");
    }
    const mouRaw = form.get("mouFile");
    return {
      data,
      mouFile: mouRaw instanceof File && mouRaw.size > 0 ? mouRaw : undefined,
    };
  }

  try {
    return { data: await req.json() };
  } catch {
    throw new Error("Invalid JSON");
  }
}

export async function POST(req: Request) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  let data: unknown;
  let mouFile: File | undefined;
  try {
    const parsed = await parseConsultantRequest(req);
    data = parsed.data;
    mouFile = parsed.mouFile;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid request body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const parsed = createSchema.safeParse(data);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg, fieldErrors: flat.fieldErrors }, { status: 400 });
  }

  const partnerRole = parsed.data.partnerRole ?? "consultant";
  if (partnerRole === "qspiders_branch" && !parsed.data.branchName?.trim()) {
    return NextResponse.json({ error: "Branch name is required for Qspiders branch accounts" }, { status: 400 });
  }

  if (mouFile && !parsed.data.academicYear) {
    return NextResponse.json(
      { error: "Academic year is required when uploading MOU", fieldErrors: { academicYear: ["Required for MOU"] } },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const spocInputs = [
    ...(parsed.data.spocs ?? []),
    ...(parsed.data.spoc ? [parsed.data.spoc] : []),
  ];

  const seenSpocEmails = new Set<string>();
  for (let i = 0; i < spocInputs.length; i++) {
    const spoc = spocInputs[i]!;
    const spocEmail = spoc.email.toLowerCase();
    const fieldPrefix = spocInputs.length === 1 ? "spoc" : `spocs.${i}`;

    if (spocEmail === email) {
      return NextResponse.json(
        {
          error: "Consultant SPOC email must differ from the consultant email",
          fieldErrors: { [`${fieldPrefix}Email`]: ["Use a different email for the SPOC"] },
        },
        { status: 400 },
      );
    }
    if (seenSpocEmails.has(spocEmail)) {
      return NextResponse.json(
        {
          error: "Duplicate SPOC email in request",
          fieldErrors: { [`${fieldPrefix}Email`]: ["Each SPOC must have a unique email"] },
        },
        { status: 400 },
      );
    }
    seenSpocEmails.add(spocEmail);

    const spocWhatsapp = spoc.whatsapp?.trim();
    if (spocWhatsapp && (!/^\d+$/.test(spocWhatsapp) || spocWhatsapp.length !== 10)) {
      return NextResponse.json(
        {
          error: "Invalid SPOC WhatsApp number",
          fieldErrors: { [`${fieldPrefix}Whatsapp`]: ["WhatsApp number must be 10 digits"] },
        },
        { status: 400 },
      );
    }

    const existingSpoc = await prisma.user.findUnique({ where: { email: spocEmail } });
    if (existingSpoc) {
      return NextResponse.json(
        {
          error: "SPOC email already exists",
          fieldErrors: { [`${fieldPrefix}Email`]: ["Email already exists"] },
        },
        { status: 409 },
      );
    }
  }

  const inviteToken = generateInviteToken();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already exists", fieldErrors: { email: ["Email already exists"] } },
      { status: 409 },
    );
  }

  const universityIds = [...new Set(parsed.data.universityIds)];

  const uniCount = await prisma.university.count({
    where: { id: { in: universityIds } },
  });
  if (uniCount !== universityIds.length) {
    return NextResponse.json({ error: "One or more universities not found" }, { status: 400 });
  }

  const partnerSlug = partnerRole === "qspiders_branch" ? ROLES.qspidersBranch : ROLES.consultant;
  const roleRow = await prisma.role.findUnique({ where: { slug: partnerSlug } });
  if (!roleRow) {
    return NextResponse.json(
      { error: `Role "${partnerSlug}" is not configured. Run the database seed.` },
      { status: 500 },
    );
  }

  const branchName =
    partnerSlug === ROLES.qspidersBranch ? parsed.data.branchName?.trim() ?? null : null;

  let mouDoc: { fileName: string; fileUrl: string } | null = null;
  if (mouFile) {
    try {
      mouDoc = await storeUpload(mouFile, "consultants/mou", "mou");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "MOU upload failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      phone: parsed.data.phone,
      inviteToken,
      accountStatus: "ACTIVE",
      universityId: universityIds[0] ?? null,
      branchName,
      companyName: parsed.data.companyName ?? null,
      designation: parsed.data.designation ?? null,
      gstNumber: parsed.data.gstNumber ? normalizeGstNumber(parsed.data.gstNumber) : null,
      panNumber: parsed.data.panNumber ? normalizePanNumber(parsed.data.panNumber) : null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      district: parsed.data.district ?? null,
      state: parsed.data.state ?? null,
      academicYear: parsed.data.academicYear ?? null,
      roles: {
        create: { roleId: roleRow.id },
      },
    },
  });

  if (mouDoc && parsed.data.academicYear) {
    await prisma.consultantDocument.create({
      data: {
        userId: user.id,
        kind: DocumentKind.MOU,
        fileName: mouDoc.fileName,
        fileUrl: mouDoc.fileUrl,
        academicYear: parsed.data.academicYear,
      },
    });
  }

  if (universityIds.length > 0) {
    await replaceConsultantUniversityAssignments(user.id, universityIds);
  }

  const spocRole =
    spocInputs.length > 0
      ? await prisma.role.findUnique({ where: { slug: ROLES.consultantSpoc } })
      : null;
  if (spocInputs.length > 0 && !spocRole) {
    return NextResponse.json({ error: "Consultant SPOC role is not configured. Run the database seed." }, { status: 500 });
  }

  const spocActivationMails: { to: string; name: string; email: string; activationUrl: string }[] = [];
  const spocUserIds: string[] = [];

  for (const spocInput of spocInputs) {
    const spocInviteToken = generateInviteToken();
    const spocUser = await prisma.user.create({
      data: {
        email: spocInput.email.toLowerCase(),
        name: spocInput.name,
        phone: spocInput.phone,
        whatsappNumber: spocInput.whatsapp?.trim() || null,
        designation: spocInput.designation ?? null,
        inviteToken: spocInviteToken,
        accountStatus: "ACTIVE",
        universityId: universityIds[0] ?? null,
        reportsToConsultantId: user.id,
        roles: {
          create: { roleId: spocRole!.id },
        },
      },
    });
    spocUserIds.push(spocUser.id);
    if (universityIds.length > 0) {
      await replaceConsultantUniversityAssignments(spocUser.id, universityIds);
    }
    spocActivationMails.push({
      to: spocInput.email.toLowerCase(),
      name: spocInput.name,
      email: spocInput.email.toLowerCase(),
      activationUrl: buildAccountActivationUrl(spocInviteToken),
    });
  }

  try {
    await sendConsultantAccountCreatedEmail({
      to: email,
      name: parsed.data.name,
      email,
      activationUrl: buildAccountActivationUrl(inviteToken),
    });
  } catch (e) {
    console.error("sendConsultantAccountCreatedEmail", e);
  }

  for (const mail of spocActivationMails) {
    try {
      await sendCounsellorPortalInviteEmail({
        to: mail.to,
        name: mail.name,
        email: mail.email,
        activationUrl: mail.activationUrl,
        inviterName: parsed.data.name,
      });
    } catch (e) {
      console.error("sendCounsellorPortalInviteEmail", e);
    }
  }

  return NextResponse.json({ ok: true, userId: user.id, spocUserIds });
}
