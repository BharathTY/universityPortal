import { DocumentKind, CetAllocationMode, MasterUniversityType, MouTenure, Prisma, ProgramLevel, ScholarshipType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendAccountCredentialsEmail, sendMouSpocDetailsToSheshuTeam } from "@/lib/email";
import { storeUpload } from "@/lib/file-storage";
import { requireMasterApi } from "@/lib/master-session";
import { generateRandomPassword, hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { generateUniqueUniversityCode } from "@/lib/university-code";
import {
  formatAcademicYearLabel,
  isSelectableYopYear,
  parseAcademicYearStartYear,
} from "@/lib/academic-year-yop";
import {
  EVENT_PHOTO_MAX_BYTES,
  MOU_PDF_MAX_BYTES,
  validateEventPhotoFile,
  validateMouPdfFile,
} from "@/lib/university-mou-documents";
import { validateUniversityPhone } from "@/lib/university-phone";
import { validateUniversityPincode } from "@/lib/university-pincode";
import { HOSTEL_FEE_COMBOS, type HostelFeeKey } from "@/lib/hostel-fee-matrix";
import { syncUniversityHostelFees } from "@/lib/university-hostel-fees-db";
import { validateAdditionalFees, validateSeatAllocation, validateTuitionFees, type StreamEntry } from "@/lib/stream-entry-payload";

const nameSchema = z.string().trim().min(1).max(200);

const optionalEmail = z.preprocess((v) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return typeof v === "string" ? v.trim() : v;
}, z.string().max(254).email().optional());

const universityPhoneSchema = z.preprocess((v) => {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v.trim() : String(v);
}, z.string().superRefine((s, ctx) => {
  const err = validateUniversityPhone(s);
  if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
}));

const optionalPhone = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return undefined;
  return typeof v === "string" ? v.trim() : String(v);
}, z.string().optional());

const optionalFee = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return undefined;
  return v;
}, z.coerce.number().optional());

const optionalNullableFee = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return null;
  return v;
}, z.coerce.number().nullable().optional());

const hostelFeeValue = z.union([z.number().nonnegative().max(999_999_999), z.null()]).optional();

const cetSeatSchema = z.object({
  programLevel: z.enum(["UG", "PG"]),
  programName: z.string().trim().min(1).max(120).optional(),
  streamName: z.string().trim().min(1).max(200),
  allocationMode: z.enum(["SEATS", "PERCENT"]).optional().default("SEATS"),
  allocationValue: z.coerce.number().nonnegative().max(999_999).optional(),
  seatCount: z.coerce.number().int().nonnegative().max(999_999).optional(),
});

const scholarshipItemSchema = z.object({
  type: z.nativeEnum(ScholarshipType),
  value: z.coerce.number().positive().max(999_999_999),
  criteria: z.array(z.string().trim().min(1).max(500)).max(20).optional().default([]),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

const universitySpocItemSchema = z.object({
  name: z.string().trim().min(1, { message: "SPOC name is required" }).max(200),
  designation: z.string().trim().min(1, { message: "Designation is required" }).max(200),
  mobile: z.string().trim().superRefine((s, ctx) => {
    const err = validateUniversityPhone(s);
    if (err) {
      const message = err.includes("10 digits") ? "Mobile number must be 10 digits" : err.replace("Contact number", "Mobile number");
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  }),
  email: z.string().trim().min(1, { message: "Email ID is required" }).email({ message: "Enter a valid email ID" }).max(254),
});

const streamDetailSchema = z.object({
  programLevel: z.enum(["UG", "PG"]),
  programName: z.string().trim().min(1).max(120),
  streamName: z.string().trim().min(1).max(200),
  targetStudents: z.coerce.number().int().nonnegative().max(999_999).optional().nullable(),
  tuitionYear1: optionalNullableFee,
  tuitionTotal: optionalNullableFee,
  registrationFee: optionalNullableFee,
  applicationFee: optionalNullableFee,
  messFee: optionalNullableFee,
  examFee: optionalNullableFee,
  otherAdminCharges: z.string().trim().max(500).optional().nullable(),
  otherAdminAmount: optionalNullableFee,
  cetAllocationMode: z.enum(["SEATS", "PERCENT"]).optional().default("SEATS"),
  cetAllocationValue: z.coerce.number().nonnegative().max(999_999).optional().default(0),
  /** @deprecated use cetAllocationValue */
  cetSeats: z.coerce.number().int().nonnegative().max(999_999).optional().default(0),
});

const createSchema = z.object({
  name: nameSchema,
  email: optionalEmail,
  phone: universityPhoneSchema,
  applicationFee: optionalFee,
  logoUrl: z.string().max(2000).optional().nullable(),
  website: z.string().trim().max(500).optional().nullable(),
  masterUniversityId: z.string().trim().min(1).max(64).optional().nullable(),
  address: z.string().trim().max(2000).optional().nullable(),
  location: z.string().trim().max(2000).optional().nullable(),
  state: z.string().trim().max(120).optional().nullable(),
  district: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  area: z.string().trim().max(120).optional().nullable(),
  pincode: z.preprocess((v) => {
    if (v === null || v === undefined) return "";
    return typeof v === "string" ? v.trim() : String(v);
  }, z.string().superRefine((s, ctx) => {
    if (s.length === 0) return;
    const err = validateUniversityPincode(s);
    if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
  }).optional().nullable()),
  universityType: z.nativeEnum(MasterUniversityType).optional().nullable(),
  spocName: z.string().trim().max(200).optional().nullable(),
  spocDesignation: z.string().trim().max(200).optional().nullable(),
  spocMobile: optionalPhone,
  spocEmail: optionalEmail,
  spocs: z.array(universitySpocItemSchema).min(1).max(20).optional(),
  mouSpocs: z.array(universitySpocItemSchema).min(1).max(20).optional(),
  offersUg: z.boolean().optional(),
  offersPg: z.boolean().optional(),
  ugStreams: z.array(z.string().trim().min(1).max(200)).optional(),
  pgStreams: z.array(z.string().trim().min(1).max(200)).optional(),
  streamDetails: z.array(streamDetailSchema).max(80).optional(),
  targetStudents: z.coerce.number().int().nonnegative().max(999_999).optional().nullable(),
  registrationFee: optionalNullableFee,
  paymentUpiId: z.string().trim().max(120).optional().nullable(),
  messFee: optionalNullableFee,
  examFee: optionalNullableFee,
  otherAdminCharges: z.string().trim().max(500).optional().nullable(),
  otherAdminAmount: optionalNullableFee,
  cetSeats: z.array(cetSeatSchema).max(80).optional(),
  scholarships: z.array(scholarshipItemSchema).max(20).optional(),
  mouYear: z.coerce.number().int().optional().nullable(),
  mouTenure: z.nativeEnum(MouTenure).optional().nullable(),
  academicYearLabel: z.string().trim().optional().nullable(),
  hostelFees: z
    .object(
      Object.fromEntries(
        HOSTEL_FEE_COMBOS.map((c) => [c.key, hostelFeeValue]),
      ) as Record<HostelFeeKey, typeof hostelFeeValue>,
    )
    .optional(),
});

const HOSTEL_COMBOS = HOSTEL_FEE_COMBOS;

type HostelKey = HostelFeeKey;

type UniversitySpocInput = {
  name: string;
  designation: string;
  mobile: string;
  email: string;
};

function resolveUniversitySpocInputs(data: z.infer<typeof createSchema>): UniversitySpocInput[] {
  if (data.spocs?.length) {
    return data.spocs.map((spoc) => ({
      name: spoc.name.trim(),
      designation: spoc.designation.trim(),
      mobile: spoc.mobile.trim(),
      email: spoc.email.trim().toLowerCase(),
    }));
  }

  const name = data.spocName?.trim();
  const designation = data.spocDesignation?.trim();
  const mobile = data.spocMobile?.trim();
  const email = data.spocEmail?.trim();
  if (name && designation && mobile && email) {
    return [
      {
        name,
        designation,
        mobile,
        email: email.toLowerCase(),
      },
    ];
  }

  return [];
}

function refineCreateBody(data: z.infer<typeof createSchema>, ctx: z.RefinementCtx) {
  const spocInputs = resolveUniversitySpocInputs(data);

  if (spocInputs.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add at least one SPOC",
      path: ["spocs"],
    });
  }

  const mouSpocInputs = data.mouSpocs ?? [];
  if (mouSpocInputs.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add at least one MOU SPOC",
      path: ["mouSpocs"],
    });
  }

  const seenMouSpocEmails = new Set<string>();
  for (let i = 0; i < mouSpocInputs.length; i++) {
    const spoc = mouSpocInputs[i]!;
    const fieldPrefix = `mouSpocs.${i}`;

    const mobileError = validateUniversityPhone(spoc.mobile);
    if (mobileError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: mobileError.includes("10 digits") ? "Mobile number must be 10 digits" : mobileError.replace("Contact number", "Mobile number"),
        path: [`${fieldPrefix}.mobile`],
      });
    }

    const email = spoc.email.toLowerCase();
    if (seenMouSpocEmails.has(email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each MOU SPOC must have a unique email ID",
        path: [`${fieldPrefix}.email`],
      });
    } else {
      seenMouSpocEmails.add(email);
    }
  }

  const seenEmails = new Set<string>();
  for (let i = 0; i < spocInputs.length; i++) {
    const spoc = spocInputs[i]!;
    const fieldPrefix = spocInputs.length === 1 && !data.spocs?.length ? "spoc" : `spocs.${i}`;

    const mobileError = validateUniversityPhone(spoc.mobile);
    if (mobileError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: mobileError.includes("10 digits") ? "Mobile number must be 10 digits" : mobileError.replace("Contact number", "Mobile number"),
        path: [`${fieldPrefix}Mobile`],
      });
    }

    const email = spoc.email.toLowerCase();
    if (seenEmails.has(email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each SPOC must have a unique email ID",
        path: [`${fieldPrefix}Email`],
      });
    } else {
      seenEmails.add(email);
    }
  }

  const spocMobile = data.spocMobile;
  if (spocMobile !== undefined && spocMobile.length > 0 && !data.spocs?.length) {
    if (!/^\d+$/.test(spocMobile)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only numeric values are allowed",
        path: ["spocMobile"],
      });
    } else if (spocMobile.length !== 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number must be 10 digits",
        path: ["spocMobile"],
      });
    }
  }

  if (data.applicationFee !== undefined && data.applicationFee !== null) {
    const n = data.applicationFee;
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid application fee",
        path: ["applicationFee"],
      });
    }
  }

  for (const key of ["registrationFee", "messFee", "examFee", "otherAdminAmount"] as const) {
    const n = data[key];
    if (n !== undefined && n !== null && (!Number.isFinite(n) || n < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid fee amount",
        path: [key],
      });
    }
  }

  for (let i = 0; i < (data.streamDetails ?? []).length; i++) {
    const stream = data.streamDetails![i]!;
    const entry = {
      id: String(i),
      programLevel: stream.programLevel,
      programName: stream.programName,
      streamName: stream.streamName,
      targetStudents: stream.targetStudents != null ? String(stream.targetStudents) : "",
      tuitionYear1: stream.tuitionYear1 != null ? String(stream.tuitionYear1) : "",
      tuitionTotal: stream.tuitionTotal != null ? String(stream.tuitionTotal) : "",
      registrationFee: stream.registrationFee != null ? String(stream.registrationFee) : "",
      applicationFee: stream.applicationFee != null ? String(stream.applicationFee) : "",
      messFee: stream.messFee != null ? String(stream.messFee) : "",
      examFee: stream.examFee != null ? String(stream.examFee) : "",
      otherAdminCharges: stream.otherAdminCharges ?? "",
      otherAdminAmount: stream.otherAdminAmount != null ? String(stream.otherAdminAmount) : "",
      hasOtherAdmin: false,
      cetAllocationMode: stream.cetAllocationMode ?? "SEATS",
      cetAllocationValue:
        stream.cetAllocationValue != null ? String(stream.cetAllocationValue) : "",
    } satisfies StreamEntry;

    const seatErrors = validateSeatAllocation(entry);
    if (seatErrors.targetStudents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: seatErrors.targetStudents,
        path: ["streamDetails", i, "targetStudents"],
      });
    }
    if (seatErrors.cet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: seatErrors.cet,
        path: ["streamDetails", i, "cetAllocationValue"],
      });
    }

    const tuitionErrors = validateTuitionFees(entry);
    if (tuitionErrors.tuitionYear1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: tuitionErrors.tuitionYear1,
        path: ["streamDetails", i, "tuitionYear1"],
      });
    }
    if (tuitionErrors.tuitionTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: tuitionErrors.tuitionTotal,
        path: ["streamDetails", i, "tuitionTotal"],
      });
    }

    const additionalErrors = validateAdditionalFees(entry);
    if (additionalErrors.applicationFee) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: additionalErrors.applicationFee,
        path: ["streamDetails", i, "applicationFee"],
      });
    }
    if (additionalErrors.examFee) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: additionalErrors.examFee,
        path: ["streamDetails", i, "examFee"],
      });
    }
    if (additionalErrors.otherAdminAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: additionalErrors.otherAdminAmount,
        path: ["streamDetails", i, "otherAdminAmount"],
      });
    }
  }
}

const createBodySchema = createSchema.superRefine(refineCreateBody);

function isValidLogoRef(s: string | null | undefined): boolean {
  if (s === undefined || s === null || s === "") return true;
  return /^https?:\/\//i.test(s) || s.startsWith("/uploads/");
}

function toDecimal(v: number | null | undefined): Prisma.Decimal | null {
  if (v === null || v === undefined) return null;
  return new Prisma.Decimal(Number(v).toFixed(2));
}

type UploadFiles = {
  mouFiles: File[];
  logoFile?: File;
  eventPhotos: File[];
};

async function parseCreateRequest(req: Request): Promise<{ data: unknown; files: UploadFiles }> {
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
    const logoRaw = form.get("logoFile");
    const mouFiles: File[] = [];
    const eventPhotos: File[] = [];
    for (const [key, val] of form.entries()) {
      if (key === "mouFiles" && val instanceof File && val.size > 0) {
        mouFiles.push(val);
      }
      if (key === "mouFile" && val instanceof File && val.size > 0) {
        mouFiles.push(val);
      }
      if (key === "eventPhotos" && val instanceof File && val.size > 0) {
        eventPhotos.push(val);
      }
    }
    return {
      data,
      files: {
        mouFiles,
        logoFile: logoRaw instanceof File && logoRaw.size > 0 ? logoRaw : undefined,
        eventPhotos,
      },
    };
  }

  try {
    return { data: await req.json(), files: { mouFiles: [], eventPhotos: [] } };
  } catch {
    throw new Error("Invalid JSON");
  }
}

export async function POST(req: Request) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  let data: unknown;
  let files: UploadFiles;
  try {
    const parsed = await parseCreateRequest(req);
    data = parsed.data;
    files = parsed.files;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid request body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(data);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return NextResponse.json(
      {
        error: "Invalid input",
        fieldErrors: flat.fieldErrors,
        formErrors: flat.formErrors,
      },
      { status: 400 },
    );
  }

  if (parsed.data.mouYear == null || !isSelectableYopYear(parsed.data.mouYear)) {
    return NextResponse.json(
      {
        error: "MOU year is required",
        fieldErrors: { mouYear: ["Select a valid MOU year"] },
      },
      { status: 400 },
    );
  }

  if (!parsed.data.mouTenure) {
    return NextResponse.json(
      {
        error: "MOU tenure is required",
        fieldErrors: { mouTenure: ["Select MOU tenure"] },
      },
      { status: 400 },
    );
  }

  if (files.mouFiles.length === 0) {
    return NextResponse.json(
      {
        error: "Upload at least one MOU document",
        fieldErrors: { mouFiles: ["Upload at least one MOU document"] },
      },
      { status: 400 },
    );
  }

  for (const mouFile of files.mouFiles) {
    const mouError = validateMouPdfFile(mouFile);
    if (mouError) {
      return NextResponse.json({ error: mouError, fieldErrors: { mouFiles: [mouError] } }, { status: 400 });
    }
  }

  for (const photo of files.eventPhotos) {
    const photoError = validateEventPhotoFile(photo);
    if (photoError) {
      return NextResponse.json({ error: photoError, fieldErrors: { eventPhotos: [photoError] } }, { status: 400 });
    }
  }

  const docAcademicYear = formatAcademicYearLabel(parsed.data.mouYear);
  const mouYearLabel = String(parsed.data.mouYear);

  let logoUrl = parsed.data.logoUrl?.trim() || null;
  if (files.logoFile) {
    try {
      const stored = await storeUpload(files.logoFile, "universities", "image");
      logoUrl = stored.fileUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Logo upload failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  if (!isValidLogoRef(logoUrl ?? undefined)) {
    return NextResponse.json({ error: "Invalid logo URL" }, { status: 400 });
  }

  let mouFileUrl: string | null = null;
  const eventPhotoUrls: string[] = [];
  const documentRows: {
    kind: DocumentKind;
    fileName: string;
    fileUrl: string;
    academicYear: string | null;
  }[] = [];

  for (const mouFile of files.mouFiles) {
    try {
      const stored = await storeUpload(mouFile, "universities/mou", "mou", {
        maxBytes: MOU_PDF_MAX_BYTES,
        allowedMime: ["application/pdf"],
      });
      if (!mouFileUrl) mouFileUrl = stored.fileUrl;
      documentRows.push({
        kind: DocumentKind.MOU,
        fileName: stored.fileName,
        fileUrl: stored.fileUrl,
        academicYear: docAcademicYear,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "MOU upload failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  for (const photo of files.eventPhotos) {
    try {
      const stored = await storeUpload(photo, "universities/events", "image", {
        maxBytes: EVENT_PHOTO_MAX_BYTES,
      });
      eventPhotoUrls.push(stored.fileUrl);
      documentRows.push({
        kind: DocumentKind.EVENT_PHOTO,
        fileName: stored.fileName,
        fileUrl: stored.fileUrl,
        academicYear: docAcademicYear,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Event photo upload failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const email = parsed.data.email?.toLowerCase() ?? null;
  const phone = parsed.data.phone.trim();
  const spocInputs = resolveUniversitySpocInputs(parsed.data);
  const primarySpoc = spocInputs[0] ?? null;

  if (email) {
    const [emailUser, emailUni] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.university.findFirst({ where: { email } }),
    ]);
    if (emailUser || emailUni) {
      return NextResponse.json(
        {
          error: "Email already exists",
          fieldErrors: { email: ["Email already exists"] },
        },
        { status: 409 },
      );
    }
  }

  const universityRole = await prisma.role.findUnique({ where: { slug: ROLES.university } });
  if (email && !universityRole) {
    return NextResponse.json({ error: "University role not configured" }, { status: 500 });
  }

  let websiteFromMaster: string | null = null;
  if (parsed.data.masterUniversityId) {
    const master = await prisma.masterUniversity.findUnique({
      where: { id: parsed.data.masterUniversityId },
      select: { id: true, website: true },
    });
    if (!master) {
      return NextResponse.json({ error: "Master university record not found" }, { status: 400 });
    }
    if (!parsed.data.website?.trim()) {
      websiteFromMaster = master.website?.trim() || null;
    }
  }

  const code = await generateUniqueUniversityCode(parsed.data.name);
  const ugStreams = (parsed.data.ugStreams ?? []).map((s) => s.trim()).filter(Boolean);
  const pgStreams = (parsed.data.pgStreams ?? []).map((s) => s.trim()).filter(Boolean);
  const offersUg = parsed.data.offersUg ?? ugStreams.length > 0;
  const offersPg = parsed.data.offersPg ?? pgStreams.length > 0;
  const locationParts = [parsed.data.city, parsed.data.district, parsed.data.state].filter(Boolean);
  const locationFromParts = locationParts.length > 0 ? locationParts.join(", ") : null;
  const location =
    parsed.data.location?.trim() ||
    parsed.data.address?.trim() ||
    locationFromParts;

  let credentialMail: { to: string; name: string; email: string; password: string } | null = null;
  const spocCredentialMails: { to: string; name: string; email: string; password: string }[] = [];

  let result: { university: { id: string; name: string; code: string }; userId: string | null };
  try {
    result = await prisma.$transaction(async (tx) => {
    const university = await tx.university.create({
      data: {
        name: parsed.data.name,
        code,
        email,
        phone,
        status: "ACTIVE",
        masterUniversityId: parsed.data.masterUniversityId ?? null,
        address: parsed.data.location?.trim() || parsed.data.address?.trim() || null,
        state: parsed.data.state?.trim() || null,
        district: parsed.data.district?.trim() || null,
        city: parsed.data.city?.trim() || null,
        area: parsed.data.area?.trim() || null,
        pincode: parsed.data.pincode?.trim() || null,
        website: parsed.data.website?.trim() || websiteFromMaster,
        location,
        universityType: parsed.data.universityType ?? null,
        spocName: primarySpoc?.name ?? null,
        spocDesignation: primarySpoc?.designation ?? null,
        spocMobile: primarySpoc?.mobile ?? null,
        spocEmail: primarySpoc?.email ?? null,
        offersUg,
        offersPg,
        ugStreams,
        pgStreams,
        targetStudents: parsed.data.targetStudents ?? null,
        registrationFee: toDecimal(parsed.data.registrationFee ?? undefined),
        applicationFee: toDecimal(parsed.data.applicationFee ?? undefined),
        paymentUpiId: parsed.data.paymentUpiId?.trim() || null,
        messFee: toDecimal(parsed.data.messFee ?? undefined),
        examFee: toDecimal(parsed.data.examFee ?? undefined),
        otherAdminCharges: parsed.data.otherAdminCharges?.trim() || null,
        otherAdminAmount: toDecimal(parsed.data.otherAdminAmount ?? undefined),
        mouYear: mouYearLabel,
        mouTenure: parsed.data.mouTenure,
        mouFileUrl,
        eventPhotoUrls,
        logoUrl,
      },
    });

    let sortOrder = 0;
    const streamDetails = parsed.data.streamDetails ?? [];
    if (streamDetails.length > 0) {
      const usedStreamNames = new Set<string>();
      for (const stream of streamDetails) {
        let dbName = stream.streamName;
        const nameKey = dbName.toLowerCase();
        if (usedStreamNames.has(nameKey)) {
          dbName = `${stream.programName} · ${stream.streamName}`;
        }
        usedStreamNames.add(dbName.toLowerCase());

        await tx.stream.create({
          data: {
            universityId: university.id,
            name: dbName,
            degreeType: stream.programName,
            programLevel: stream.programLevel as ProgramLevel,
            sortOrder: sortOrder++,
            totalSeats: stream.targetStudents ?? 0,
            tuitionYear1: toDecimal(stream.tuitionYear1 ?? undefined),
            tuitionTotal: toDecimal(stream.tuitionTotal ?? undefined),
            streamFee: toDecimal(stream.registrationFee ?? undefined),
            applicationFee: toDecimal(stream.applicationFee ?? undefined),
            messFee: toDecimal(stream.messFee ?? undefined),
            examFee: toDecimal(stream.examFee ?? undefined),
            otherAdminCharges: stream.otherAdminCharges?.trim() || null,
            otherAdminAmount: toDecimal(stream.otherAdminAmount ?? undefined),
          },
        });
      }
    } else {
      for (const streamName of ugStreams) {
        await tx.stream.create({
          data: {
            universityId: university.id,
            name: streamName,
            programLevel: ProgramLevel.UG,
            sortOrder: sortOrder++,
          },
        });
      }
      for (const streamName of pgStreams) {
        await tx.stream.create({
          data: {
            universityId: university.id,
            name: streamName,
            programLevel: ProgramLevel.PG,
            sortOrder: sortOrder++,
          },
        });
      }
    }

    for (const seat of parsed.data.cetSeats ?? []) {
      const mode =
        seat.allocationMode === "PERCENT" ? CetAllocationMode.PERCENT : CetAllocationMode.SEATS;
      const value = seat.allocationValue ?? seat.seatCount ?? 0;
      await tx.universityCetSeat.create({
        data: {
          universityId: university.id,
          programLevel: seat.programLevel as ProgramLevel,
          programName: seat.programName?.trim() || null,
          streamName: seat.streamName,
          allocationMode: mode,
          allocationValue: toDecimal(value),
          seatCount: mode === CetAllocationMode.SEATS ? Math.round(value) : seat.seatCount ?? 0,
        },
      });
    }

    for (const scholarship of parsed.data.scholarships ?? []) {
      await tx.universityScholarship.create({
        data: {
          universityId: university.id,
          type: scholarship.type,
          value: toDecimal(scholarship.value)!,
          criteria: scholarship.criteria,
          sortOrder: scholarship.sortOrder ?? 0,
        },
      });
    }

    if (parsed.data.hostelFees) {
      await syncUniversityHostelFees(tx, university.id, parsed.data.hostelFees);
    }

    for (const doc of documentRows) {
      await tx.universityDocument.create({
        data: {
          universityId: university.id,
          kind: doc.kind,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          academicYear: doc.academicYear,
        },
      });
    }

    for (let i = 0; i < spocInputs.length; i++) {
      const spoc = spocInputs[i]!;
      await tx.universitySpoc.create({
        data: {
          universityId: university.id,
          name: spoc.name,
          designation: spoc.designation,
          mobile: spoc.mobile,
          email: spoc.email,
          sortOrder: i,
        },
      });

      if (universityRole && spoc.email.toLowerCase() !== email?.toLowerCase()) {
        const existingSpocUser = await tx.user.findUnique({ where: { email: spoc.email } });
        if (!existingSpocUser) {
          const spocPassword = generateRandomPassword();
          await tx.user.create({
            data: {
              email: spoc.email,
              name: spoc.name,
              phone: spoc.mobile,
              passwordHash: await hashPassword(spocPassword),
              accountStatus: "ACTIVE",
              universityId: university.id,
              designation: spoc.designation,
              roles: { create: { roleId: universityRole.id } },
            },
          });
          spocCredentialMails.push({
            to: spoc.email,
            name: spoc.name,
            email: spoc.email,
            password: spocPassword,
          });
        }
      }
    }

    for (let i = 0; i < (parsed.data.mouSpocs ?? []).length; i++) {
      const mouSpoc = parsed.data.mouSpocs![i]!;
      await tx.universityMouSpoc.create({
        data: {
          universityId: university.id,
          name: mouSpoc.name.trim(),
          designation: mouSpoc.designation.trim(),
          mobile: mouSpoc.mobile.trim(),
          email: mouSpoc.email.trim().toLowerCase(),
          sortOrder: i,
        },
      });
    }

    if (docAcademicYear) {
      await tx.academicYear.upsert({
        where: {
          universityId_label: { universityId: university.id, label: docAcademicYear },
        },
        create: {
          universityId: university.id,
          label: docAcademicYear,
          sortOrder: parseAcademicYearStartYear(docAcademicYear) ?? 0,
        },
        update: {},
      });
    }

    if (email && universityRole) {
      const plainPassword = generateRandomPassword();
      const passwordHash = await hashPassword(plainPassword);
      const user = await tx.user.create({
        data: {
          email,
          name: parsed.data.name,
          phone,
          passwordHash,
          accountStatus: "ACTIVE",
          universityId: university.id,
          roles: {
            create: { roleId: universityRole.id },
          },
        },
      });
      credentialMail = {
        to: email,
        name: parsed.data.name,
        email,
        password: plainPassword,
      };
      return { university, userId: user.id as string };
    }

    return { university, userId: null as string | null };
  });
  } catch (e) {
    console.error("POST /api/master/universities failed", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = Array.isArray(e.meta?.target) ? e.meta.target.join(", ") : "unique field";
      return NextResponse.json(
        { error: `A record with this ${target} already exists`, fieldErrors: {} },
        { status: 409 },
      );
    }
    const message = e instanceof Error ? e.message : "Could not create university";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (credentialMail) {
    try {
      await sendAccountCredentialsEmail(credentialMail);
    } catch (e) {
      console.error("sendAccountCredentialsEmail", e);
    }
  }

  for (const mail of spocCredentialMails) {
    try {
      await sendAccountCredentialsEmail(mail);
    } catch (e) {
      console.error("sendAccountCredentialsEmail spoc", e);
    }
  }

  try {
    await sendMouSpocDetailsToSheshuTeam({
      universityName: result.university.name,
      universityCode: result.university.code,
      mouYear: mouYearLabel,
      mouTenure: parsed.data.mouTenure ?? null,
      spocs: (parsed.data.mouSpocs ?? []).map((s) => ({
        name: s.name.trim(),
        designation: s.designation.trim(),
        mobile: s.mobile.trim(),
        email: s.email.trim(),
      })),
    });
  } catch (e) {
    console.error("sendMouSpocDetailsToSheshuTeam", e);
  }

  return NextResponse.json({
    ok: true,
    universityId: result.university.id,
    userId: result.userId,
    code: result.university.code,
  });
}
