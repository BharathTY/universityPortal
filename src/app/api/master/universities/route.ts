import {
  DocumentKind,
  HostelGender,
  HostelRoomType,
  HostelSharing,
  MasterUniversityType,
  Prisma,
  ProgramLevel,
} from "@prisma/client";
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

const nameSchema = z.string().trim().min(1).max(200);

const optionalEmail = z.preprocess((v) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return typeof v === "string" ? v.trim() : v;
}, z.string().max(254).email().optional());

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
  streamName: z.string().trim().min(1).max(200),
  seatCount: z.coerce.number().int().nonnegative().max(999_999),
});

const streamDetailSchema = z.object({
  programLevel: z.enum(["UG", "PG"]),
  streamName: z.string().trim().min(1).max(200),
  targetStudents: z.coerce.number().int().nonnegative().max(999_999).optional().nullable(),
  registrationFee: optionalNullableFee,
  applicationFee: optionalNullableFee,
  messFee: optionalNullableFee,
  examFee: optionalNullableFee,
  otherAdminCharges: z.string().trim().max(500).optional().nullable(),
  otherAdminAmount: optionalNullableFee,
  cetSeats: z.coerce.number().int().nonnegative().max(999_999).optional().default(0),
});

const createSchema = z.object({
  name: nameSchema,
  email: optionalEmail,
  phone: optionalPhone,
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
  offersUg: z.boolean().optional(),
  offersPg: z.boolean().optional(),
  ugStreams: z.array(z.string().trim().min(1).max(200)).optional(),
  pgStreams: z.array(z.string().trim().min(1).max(200)).optional(),
  streamDetails: z.array(streamDetailSchema).max(80).optional(),
  targetStudents: z.coerce.number().int().nonnegative().max(999_999).optional().nullable(),
  registrationFee: optionalNullableFee,
  messFee: optionalNullableFee,
  examFee: optionalNullableFee,
  otherAdminCharges: z.string().trim().max(500).optional().nullable(),
  otherAdminAmount: optionalNullableFee,
  cetSeats: z.array(cetSeatSchema).max(80).optional(),
  academicYearLabel: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((s) => !s || isSelectableYopYearLabel(s), { message: "Select a valid academic year" })
    .transform((s) => (s ? normalizeAcademicYearLabel(s) : null)),
  hostelFees: z
    .object({
      girlsAc2: hostelFeeValue,
      girlsAc4: hostelFeeValue,
      girlsNonAc2: hostelFeeValue,
      girlsNonAc4: hostelFeeValue,
      boysAc2: hostelFeeValue,
      boysAc4: hostelFeeValue,
      boysNonAc2: hostelFeeValue,
      boysNonAc4: hostelFeeValue,
    })
    .optional(),
});

const HOSTEL_COMBOS = [
  { key: "girlsAc2", gender: HostelGender.GIRLS, roomType: HostelRoomType.AC, sharing: HostelSharing.TWO_SHARING },
  {
    key: "girlsAc4",
    gender: HostelGender.GIRLS,
    roomType: HostelRoomType.AC,
    sharing: HostelSharing.FOUR_SHARING,
  },
  {
    key: "girlsNonAc2",
    gender: HostelGender.GIRLS,
    roomType: HostelRoomType.NON_AC,
    sharing: HostelSharing.TWO_SHARING,
  },
  {
    key: "girlsNonAc4",
    gender: HostelGender.GIRLS,
    roomType: HostelRoomType.NON_AC,
    sharing: HostelSharing.FOUR_SHARING,
  },
  { key: "boysAc2", gender: HostelGender.BOYS, roomType: HostelRoomType.AC, sharing: HostelSharing.TWO_SHARING },
  { key: "boysAc4", gender: HostelGender.BOYS, roomType: HostelRoomType.AC, sharing: HostelSharing.FOUR_SHARING },
  {
    key: "boysNonAc2",
    gender: HostelGender.BOYS,
    roomType: HostelRoomType.NON_AC,
    sharing: HostelSharing.TWO_SHARING,
  },
  {
    key: "boysNonAc4",
    gender: HostelGender.BOYS,
    roomType: HostelRoomType.NON_AC,
    sharing: HostelSharing.FOUR_SHARING,
  },
] as const;

type HostelKey = (typeof HOSTEL_COMBOS)[number]["key"];

function refineCreateBody(data: z.infer<typeof createSchema>, ctx: z.RefinementCtx) {
  for (const field of ["phone", "spocMobile"] as const) {
    const p = data[field];
    if (p !== undefined && p.length > 0) {
      if (!/^\d+$/.test(p)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Only numeric values are allowed",
          path: [field],
        });
      } else if (p.length !== 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phone number must be 10 digits",
          path: [field],
        });
      }
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
  const phone = parsed.data.phone?.trim() || null;
  const spocEmail = parsed.data.spocEmail?.toLowerCase() ?? null;

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
        spocName: parsed.data.spocName?.trim() || null,
        spocDesignation: parsed.data.spocDesignation?.trim() || null,
        spocMobile: parsed.data.spocMobile?.trim() || null,
        spocEmail,
        offersUg,
        offersPg,
        ugStreams,
        pgStreams,
        targetStudents: parsed.data.targetStudents ?? null,
        registrationFee: toDecimal(parsed.data.registrationFee ?? undefined),
        applicationFee: toDecimal(parsed.data.applicationFee ?? undefined),
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
      for (const stream of streamDetails) {
        await tx.stream.create({
          data: {
            universityId: university.id,
            name: stream.streamName,
            programLevel: stream.programLevel as ProgramLevel,
            sortOrder: sortOrder++,
            totalSeats: stream.targetStudents ?? 0,
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
      await tx.universityCetSeat.create({
        data: {
          universityId: university.id,
          programLevel: seat.programLevel as ProgramLevel,
          streamName: seat.streamName,
          seatCount: seat.seatCount,
        },
      });
    }

    if (parsed.data.hostelFees) {
      for (const def of HOSTEL_COMBOS) {
        const raw = parsed.data.hostelFees[def.key as HostelKey];
        if (raw === undefined || raw === null) continue;
        if (!Number.isFinite(raw) || raw < 0) {
          throw new Error("Invalid hostel fee amount");
        }
        await tx.universityHostelFee.create({
          data: {
            universityId: university.id,
            gender: def.gender,
            roomType: def.roomType,
            sharing: def.sharing,
            amount: new Prisma.Decimal(Number(raw).toFixed(2)),
          },
        });
      }
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

  return NextResponse.json({
    ok: true,
    universityId: result.university.id,
    userId: result.userId,
    code: result.university.code,
  });
}
