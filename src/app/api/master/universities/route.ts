import { DocumentKind, CetAllocationMode, MasterUniversityType, Prisma, ProgramLevel, ScholarshipType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendAccountCredentialsEmail } from "@/lib/email";
import { storeUpload } from "@/lib/file-storage";
import { requireMasterApi } from "@/lib/master-session";
import { generateRandomPassword, hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { generateUniqueUniversityCode } from "@/lib/university-code";
import {
  isSelectableYopYearLabel,
  normalizeAcademicYearLabel,
  parseAcademicYearStartYear,
} from "@/lib/academic-year-yop";
import { validateUniversityPhone } from "@/lib/university-phone";
import { HOSTEL_FEE_COMBOS, type HostelFeeKey } from "@/lib/hostel-fee-matrix";
import { syncUniversityHostelFees } from "@/lib/university-hostel-fees-db";

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
  criteria: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

const universitySpocItemSchema = z.object({
  name: z.string().trim().min(1, { message: "SPOC name is required" }).max(200),
  designation: z.string().trim().min(1, { message: "Designation is required" }).max(200),
  mobile: z.string().trim().min(1, { message: "Mobile number is required" }).max(32),
  email: z.string().trim().min(1, { message: "Email address is required" }).email().max(254),
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
  state: z.string().trim().max(120).optional().nullable(),
  district: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  pincode: z.string().trim().max(10).optional().nullable(),
  universityType: z.nativeEnum(MasterUniversityType).optional().nullable(),
  spocName: z.string().trim().max(200).optional().nullable(),
  spocDesignation: z.string().trim().max(200).optional().nullable(),
  spocMobile: optionalPhone,
  spocEmail: optionalEmail,
  spocs: z.array(universitySpocItemSchema).min(1).max(20).optional(),
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
  academicYearLabel: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((s) => !s || isSelectableYopYearLabel(s), { message: "Select a valid academic year" })
    .transform((s) => (s ? normalizeAcademicYearLabel(s) : null)),
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

  const seenEmails = new Set<string>();
  for (let i = 0; i < spocInputs.length; i++) {
    const spoc = spocInputs[i]!;
    const fieldPrefix = spocInputs.length === 1 && !data.spocs?.length ? "spoc" : `spocs.${i}`;

    if (!/^\d+$/.test(spoc.mobile)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only numeric values are allowed",
        path: [`${fieldPrefix}Mobile`],
      });
    } else if (spoc.mobile.length !== 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number must be 10 digits",
        path: [`${fieldPrefix}Mobile`],
      });
    }

    const email = spoc.email.toLowerCase();
    if (seenEmails.has(email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each SPOC must have a unique email",
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
  mouFile?: File;
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
    const mouRaw = form.get("mouFile");
    const logoRaw = form.get("logoFile");
    const eventPhotos: File[] = [];
    for (const [key, val] of form.entries()) {
      if (key === "eventPhotos" && val instanceof File && val.size > 0) {
        eventPhotos.push(val);
      }
    }
    return {
      data,
      files: {
        mouFile: mouRaw instanceof File && mouRaw.size > 0 ? mouRaw : undefined,
        logoFile: logoRaw instanceof File && logoRaw.size > 0 ? logoRaw : undefined,
        eventPhotos,
      },
    };
  }

  try {
    return { data: await req.json(), files: { eventPhotos: [] } };
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

  if ((files.mouFile || files.eventPhotos.length > 0) && !parsed.data.academicYearLabel?.trim()) {
    return NextResponse.json(
      {
        error: "Academic year is required when uploading MOU or event photos",
        fieldErrors: { academicYear: ["Select an academic year for MOU and event photos"] },
      },
      { status: 400 },
    );
  }

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
  const docAcademicYear = parsed.data.academicYearLabel ?? null;
  const documentRows: {
    kind: DocumentKind;
    fileName: string;
    fileUrl: string;
    academicYear: string | null;
  }[] = [];

  if (files.mouFile) {
    try {
      const stored = await storeUpload(files.mouFile, "universities/mou", "mou");
      mouFileUrl = stored.fileUrl;
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
      const stored = await storeUpload(photo, "universities/events", "image");
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
  const location = locationParts.length > 0 ? locationParts.join(", ") : null;

  let credentialMail: { to: string; name: string; email: string; password: string } | null = null;
  const spocCredentialMails: { to: string; name: string; email: string; password: string }[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const university = await tx.university.create({
      data: {
        name: parsed.data.name,
        code,
        email,
        phone,
        status: "ACTIVE",
        masterUniversityId: parsed.data.masterUniversityId ?? null,
        address: parsed.data.address?.trim() || null,
        state: parsed.data.state?.trim() || null,
        district: parsed.data.district?.trim() || null,
        city: parsed.data.city?.trim() || null,
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

  return NextResponse.json({
    ok: true,
    universityId: result.university.id,
    userId: result.userId,
    code: result.university.code,
  });
}
