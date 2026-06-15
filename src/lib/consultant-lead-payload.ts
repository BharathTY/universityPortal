import { Prisma, ProgramLevel } from "@prisma/client";
import { z } from "zod";
import { SSLC_BOARDS, SSLC_RESULT_TYPES, STUDENT_CATEGORIES, STUDENT_TITLES } from "@/lib/student-form-options";

export const optionalDecimal = z.union([z.number(), z.string()]).optional().nullable();
export const optionalInt = z.union([z.number().int(), z.string()]).optional().nullable();

const titleValues = STUDENT_TITLES.map((t) => t.value) as [string, ...string[]];
const categoryValues = STUDENT_CATEGORIES.map((c) => c.value) as [string, ...string[]];
const boardValues = SSLC_BOARDS.map((b) => b.value) as [string, ...string[]];
const resultTypeValues = SSLC_RESULT_TYPES.map((r) => r.value) as [string, ...string[]];

export const entranceExamRowSchema = z.object({
  examName: z.string().min(1).max(120).trim(),
  centreName: z.string().min(1).max(200).trim(),
  registrationNumber: z.string().max(64).trim().optional().nullable(),
  scoreRank: z.string().min(1).max(64).trim(),
  examYear: optionalInt,
});

export type EntranceExamInput = z.infer<typeof entranceExamRowSchema>;

const mobileSchema = z
  .string()
  .trim()
  .refine((s) => {
    const digits = s.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }, { message: "Enter a valid mobile number (10–15 digits)" });

function validateOptionalScore(
  ctx: z.RefinementCtx,
  resultType: string,
  scoreRaw: number | string | null | undefined,
  path: string,
) {
  const score = parseOptionalDecimal(scoreRaw);
  if (score == null) return;
  const scoreNum = Number(String(score));
  if (resultType === "PERCENTAGE") {
    if (scoreNum < 0 || scoreNum > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Percentage must be between 0 and 100", path: [path] });
    }
  } else if (scoreNum < 0 || scoreNum > 10) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CGPA must be between 0 and 10", path: [path] });
  }
}

function validateScore(
  ctx: z.RefinementCtx,
  resultType: string,
  scoreRaw: number | string | null | undefined,
  path: string,
) {
  const score = parseOptionalDecimal(scoreRaw);
  if (score == null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Score is required", path: [path] });
    return;
  }
  const scoreNum = Number(String(score));
  if (resultType === "PERCENTAGE") {
    if (scoreNum < 0 || scoreNum > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Percentage must be between 0 and 100", path: [path] });
    }
  } else if (scoreNum < 0 || scoreNum > 10) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CGPA must be between 0 and 10", path: [path] });
  }
}

export const consultantLeadBodySchema = z.object({
  universityId: z.string().min(1).optional(),
  academicYearId: z.string().min(1).optional(),
  streamId: z.string().min(1),
  programType: z.enum(["UG", "PG"]),
  admissionDegreeType: z.string().min(1).max(120).trim(),
  studentTitle: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.enum(titleValues).optional().nullable(),
  ),
  firstName: z.string().min(1).max(120).trim(),
  lastName: z.string().min(1).max(120).trim(),
  email: z.string().email().max(254).trim(),
  mobile: mobileSchema,
  gender: z.string().min(1).max(32).trim(),
  dateOfBirth: z.string().min(1).max(32),
  category: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.enum(categoryValues).optional().nullable(),
  ),
  caste: z.string().max(120).trim().optional().nullable(),
  religion: z.string().max(120).trim().optional().nullable(),
  nationality: z.string().min(1).max(120).trim(),
  guardianName: z.string().min(1).max(120).trim(),
  guardianMobile: mobileSchema,
  uidaiNumber: z.string().max(12).trim().optional().nullable(),
  abcApaarId: z.string().max(64).trim().optional().nullable(),
  admissionState: z.string().min(1).max(120).trim(),
  addressLine1: z.string().min(1).max(500).trim(),
  addressLine2: z.string().max(500).trim().optional().nullable(),
  city: z.string().min(1).max(120).trim(),
  district: z.string().min(1).max(120).trim(),
  state: z.string().min(1).max(120).trim(),
  country: z.string().min(1).max(120).trim(),
  pincode: z.string().min(1).max(12).trim(),
  correspondenceAddress: z.string().min(1).max(1000).trim(),
  sslcSchool: z.string().min(1).max(200).trim(),
  sslcBoard: z.enum(boardValues),
  sslcYear: optionalInt,
  sslcResultType: z.enum(resultTypeValues),
  sslcPercent: optionalDecimal,
  qualificationType: z.enum(["PUC", "DIPLOMA", "ITI"]),
  qualInstitution: z.string().min(1).max(200).trim(),
  qualBoardUniversity: z.string().min(1).max(200).trim(),
  qualYear: optionalInt,
  qualResultType: z.enum(resultTypeValues),
  qualScore: optionalDecimal,
  priorDegreeType: z.string().max(120).trim().optional().nullable(),
  priorDegreeName: z.string().max(200).trim().optional().nullable(),
  priorDegreeStream: z.string().max(200).trim().optional().nullable(),
  priorDegreeCollege: z.string().max(200).trim().optional().nullable(),
  priorDegreeUniversity: z.string().max(200).trim().optional().nullable(),
  priorDegreeYear: optionalInt,
  priorDegreeResultType: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.enum(resultTypeValues).optional().nullable(),
  ),
  priorDegreeScore: optionalDecimal,
  hasEntranceExams: z.boolean().optional().default(false),
  entranceExams: z.array(entranceExamRowSchema).optional().default([]),
  referralFirstName: z.string().max(120).trim().optional().nullable(),
  referralLastName: z.string().max(120).trim().optional().nullable(),
  referralPhone: z.string().max(32).trim().optional().nullable(),
  referralEmail: z.string().max(254).trim().optional().nullable(),
}).superRefine((data, ctx) => {
  const sslcYear = parseOptionalInt(data.sslcYear);
  if (sslcYear == null || sslcYear < 1980 || sslcYear > new Date().getFullYear()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid year of passing", path: ["sslcYear"] });
  }
  validateScore(ctx, data.sslcResultType, data.sslcPercent, "sslcPercent");

  const qualYear = parseOptionalInt(data.qualYear);
  if (qualYear == null || qualYear < 1980 || qualYear > new Date().getFullYear()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid year of passing", path: ["qualYear"] });
  }
  validateScore(ctx, data.qualResultType, data.qualScore, "qualScore");

  const priorYear = parseOptionalInt(data.priorDegreeYear);
  if (data.priorDegreeYear != null && data.priorDegreeYear !== "" && priorYear != null) {
    if (priorYear < 1980 || priorYear > new Date().getFullYear()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid year of passing", path: ["priorDegreeYear"] });
    }
  }
  if (data.priorDegreeScore != null && data.priorDegreeScore !== "" && data.priorDegreeResultType) {
    validateOptionalScore(ctx, data.priorDegreeResultType, data.priorDegreeScore, "priorDegreeScore");
  }

  if (data.hasEntranceExams) {
    if (!data.entranceExams?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one entrance examination record",
        path: ["entranceExams"],
      });
    } else {
      data.entranceExams.forEach((exam, index) => {
        const year = parseOptionalInt(exam.examYear);
        if (year == null || year < 1980 || year > new Date().getFullYear()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter a valid year of examination",
            path: ["entranceExams", index, "examYear"],
          });
        }
      });
    }
  }

  const uidai = data.uidaiNumber?.replace(/\D/g, "") ?? "";
  if (uidai.length > 0 && uidai.length !== 12) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "UIDAI number must be 12 digits", path: ["uidaiNumber"] });
  }
  if (data.pincode.replace(/\D/g, "").length !== 6) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "PIN code must be 6 digits", path: ["pincode"] });
  }
});

export type ConsultantLeadBody = z.infer<typeof consultantLeadBodySchema>;

export function parseOptionalDate(value: string | null | undefined): Date | null {
  if (value == null || value.trim() === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseOptionalDecimal(value: number | string | null | undefined): Prisma.Decimal | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return new Prisma.Decimal(n);
}

export function parseOptionalInt(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function decimalToInput(value: Prisma.Decimal | number | null | undefined): string {
  if (value == null) return "";
  const n = Number(String(value));
  return Number.isFinite(n) ? String(n) : "";
}

export function dateToInput(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function buildLeadExtendedData(data: ConsultantLeadBody) {
  let referralEmail: string | null = null;
  const refE = data.referralEmail?.trim();
  if (refE) {
    const ok = z.string().email().safeParse(refE);
    if (!ok.success) throw new Error("INVALID_REFERRAL_EMAIL");
    referralEmail = refE.toLowerCase();
  }

  const refPhone = data.referralPhone?.trim();
  if (refPhone && refPhone.replace(/\D/g, "").length < 10) {
    throw new Error("INVALID_REFERRAL_PHONE");
  }

  const addressLine1 = data.addressLine1.trim();
  const uidai = data.uidaiNumber?.replace(/\D/g, "") ?? "";
  const qualScore = parseOptionalDecimal(data.qualScore);
  const qualInstitution = data.qualInstitution.trim();
  const qualBoard = data.qualBoardUniversity.trim();
  const qualYear = parseOptionalInt(data.qualYear);

  return {
    studentTitle: data.studentTitle ?? null,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email.toLowerCase(),
    mobile: data.mobile,
    gender: data.gender.trim(),
    dateOfBirth: parseOptionalDate(data.dateOfBirth),
    category: data.category ?? null,
    caste: data.caste?.trim() || null,
    religion: data.religion?.trim() || null,
    nationality: data.nationality.trim(),
    fatherName: data.guardianName.trim(),
    fatherMobile: data.guardianMobile.trim(),
    uidaiNumber: uidai.length > 0 ? uidai : null,
    abcApaarId: data.abcApaarId?.trim() || null,
    admissionState: data.admissionState,
    programInterest: data.programType as ProgramLevel,
    admissionDegreeType: data.admissionDegreeType.trim(),
    address: addressLine1,
    addressLine1,
    addressLine2: data.addressLine2?.trim() || null,
    city: data.city.trim(),
    district: data.district.trim(),
    state: data.state.trim(),
    country: data.country.trim(),
    pincode: data.pincode.replace(/\D/g, ""),
    correspondenceAddress: data.correspondenceAddress.trim(),
    sslcSchool: data.sslcSchool.trim(),
    sslcBoard: data.sslcBoard,
    sslcYear: parseOptionalInt(data.sslcYear),
    sslcResultType: data.sslcResultType,
    sslcPercent: parseOptionalDecimal(data.sslcPercent),
    qualificationType: data.qualificationType,
    qualInstitution,
    qualBoardUniversity: qualBoard,
    qualYear,
    qualResultType: data.qualResultType,
    qualScore,
    pucBoard: data.qualificationType === "PUC" ? qualBoard : null,
    pucYear: data.qualificationType === "PUC" ? qualYear : null,
    pucPercent: data.qualificationType === "PUC" ? qualScore : null,
    priorDegreeType: data.priorDegreeType?.trim() || null,
    priorDegreeYear: parseOptionalInt(data.priorDegreeYear),
    priorDegreeResultType: data.priorDegreeResultType ?? null,
    degreeName: data.priorDegreeName?.trim() || null,
    degreeStream: data.priorDegreeStream?.trim() || null,
    degreeCollege: data.priorDegreeCollege?.trim() || null,
    degreeUniversity: data.priorDegreeUniversity?.trim() || null,
    degreePercent: parseOptionalDecimal(data.priorDegreeScore),
    hasEntranceExams: Boolean(data.hasEntranceExams),
    referralFirstName: data.referralFirstName?.trim() || null,
    referralLastName: data.referralLastName?.trim() || null,
    referralPhone: data.referralPhone?.trim() || null,
    referralEmail,
  };
}

export type ConsultantLeadUploadFiles = {
  photoFile: File | null;
  sslcMarksCardFile: File | null;
  qualMarksCardFile: File | null;
};

export async function parseConsultantLeadRequest(req: Request): Promise<{ data: unknown } & ConsultantLeadUploadFiles> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const payloadRaw = form.get("payload");
    if (typeof payloadRaw !== "string") throw new Error("Missing payload");
    const pickFile = (key: string) => {
      const raw = form.get(key);
      return raw instanceof File && raw.size > 0 ? raw : null;
    };
    return {
      data: JSON.parse(payloadRaw) as unknown,
      photoFile: pickFile("photoFile"),
      sslcMarksCardFile: pickFile("sslcMarksCardFile") ?? pickFile("marksCardFile"),
      qualMarksCardFile: pickFile("qualMarksCardFile"),
    };
  }
  return { data: await req.json(), photoFile: null, sslcMarksCardFile: null, qualMarksCardFile: null };
}

export type SerializedConsultantLeadDetail = {
  id: string;
  universityId: string;
  academicYearId: string;
  streamId: string;
  programType: string;
  admissionDegreeType: string | null;
  studentTitle: string | null;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  gender: string | null;
  dateOfBirth: string;
  category: string | null;
  caste: string | null;
  religion: string | null;
  nationality: string | null;
  guardianName: string | null;
  guardianMobile: string | null;
  uidaiNumber: string | null;
  abcApaarId: string | null;
  admissionState: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  correspondenceAddress: string | null;
  photoUrl: string | null;
  sslcSchool: string | null;
  sslcBoard: string | null;
  sslcYear: number | null;
  sslcResultType: string | null;
  sslcPercent: string;
  sslcMarksCardUrl: string | null;
  qualificationType: string | null;
  qualInstitution: string | null;
  qualBoardUniversity: string | null;
  qualYear: number | null;
  qualResultType: string | null;
  qualScore: string;
  qualMarksCardUrl: string | null;
  priorDegreeType: string | null;
  priorDegreeName: string | null;
  priorDegreeStream: string | null;
  priorDegreeCollege: string | null;
  priorDegreeUniversity: string | null;
  priorDegreeYear: number | null;
  priorDegreeResultType: string | null;
  priorDegreeScore: string;
  hasEntranceExams: boolean;
  entranceExams: {
    id?: string;
    examName: string;
    centreName: string;
    registrationNumber: string | null;
    scoreRank: string;
    examYear: number;
  }[];
  referralFirstName: string | null;
  referralLastName: string | null;
  referralPhone: string | null;
  referralEmail: string | null;
};

export function serializeConsultantLeadForClient(lead: ConsultantLeadDetail): SerializedConsultantLeadDetail {
  const qualInstitution = lead.qualInstitution ?? (lead.priorDegreeType ? null : lead.degreeCollege);
  const qualBoard = lead.qualBoardUniversity ?? lead.pucBoard ?? (lead.priorDegreeType ? null : lead.degreeUniversity);
  const qualYear = lead.qualYear ?? lead.pucYear;
  const qualScore = lead.qualScore ?? lead.pucPercent ?? (lead.priorDegreeType ? null : lead.degreePercent);

  return {
    id: lead.id,
    universityId: lead.universityId,
    academicYearId: lead.academicYearId,
    streamId: lead.streamId,
    programType: lead.programInterest ?? lead.stream?.programLevel ?? "",
    admissionDegreeType: lead.admissionDegreeType ?? lead.stream?.degreeType ?? "",
    studentTitle: lead.studentTitle,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    mobile: lead.mobile,
    gender: lead.gender,
    dateOfBirth: dateToInput(lead.dateOfBirth),
    category: lead.category,
    caste: lead.caste,
    religion: lead.religion,
    nationality: lead.nationality,
    guardianName: lead.fatherName,
    guardianMobile: lead.fatherMobile,
    uidaiNumber: lead.uidaiNumber,
    abcApaarId: lead.abcApaarId,
    admissionState: lead.admissionState ?? "",
    addressLine1: lead.addressLine1 ?? lead.address ?? "",
    addressLine2: lead.addressLine2,
    city: lead.city,
    district: lead.district,
    state: lead.state,
    country: lead.country,
    pincode: lead.pincode,
    correspondenceAddress: lead.correspondenceAddress,
    photoUrl: lead.photoUrl,
    sslcSchool: lead.sslcSchool,
    sslcBoard: lead.sslcBoard,
    sslcYear: lead.sslcYear,
    sslcResultType: lead.sslcResultType,
    sslcPercent: decimalToInput(lead.sslcPercent),
    sslcMarksCardUrl: lead.sslcMarksCardUrl,
    qualificationType: lead.qualificationType,
    qualInstitution,
    qualBoardUniversity: qualBoard,
    qualYear,
    qualResultType: lead.qualResultType ?? (qualScore != null ? "PERCENTAGE" : ""),
    qualScore: decimalToInput(qualScore),
    qualMarksCardUrl: lead.qualMarksCardUrl,
    priorDegreeType: lead.priorDegreeType,
    priorDegreeName: lead.degreeName,
    priorDegreeStream: lead.degreeStream,
    priorDegreeCollege: lead.degreeCollege,
    priorDegreeUniversity: lead.degreeUniversity,
    priorDegreeYear: lead.priorDegreeYear,
    priorDegreeResultType: lead.priorDegreeResultType,
    priorDegreeScore: decimalToInput(lead.degreePercent),
    hasEntranceExams: lead.hasEntranceExams,
    entranceExams: (lead.entranceExams ?? []).map((exam) => ({
      id: exam.id,
      examName: exam.examName,
      centreName: exam.centreName,
      registrationNumber: exam.registrationNumber,
      scoreRank: exam.scoreRank,
      examYear: exam.examYear,
    })),
    referralFirstName: lead.referralFirstName,
    referralLastName: lead.referralLastName,
    referralPhone: lead.referralPhone,
    referralEmail: lead.referralEmail,
  };
}

export const consultantLeadDetailSelect = {
  id: true,
  universityId: true,
  academicYearId: true,
  streamId: true,
  studentTitle: true,
  firstName: true,
  lastName: true,
  email: true,
  mobile: true,
  gender: true,
  dateOfBirth: true,
  category: true,
  caste: true,
  religion: true,
  nationality: true,
  fatherName: true,
  fatherMobile: true,
  uidaiNumber: true,
  abcApaarId: true,
  admissionState: true,
  programInterest: true,
  admissionDegreeType: true,
  admissionStatus: true,
  pipelineStatus: true,
  address: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  district: true,
  state: true,
  country: true,
  pincode: true,
  correspondenceAddress: true,
  photoUrl: true,
  sslcSchool: true,
  sslcBoard: true,
  sslcYear: true,
  sslcResultType: true,
  sslcPercent: true,
  sslcMarksCardUrl: true,
  qualificationType: true,
  qualInstitution: true,
  qualBoardUniversity: true,
  qualYear: true,
  qualResultType: true,
  qualScore: true,
  qualMarksCardUrl: true,
  pucBoard: true,
  pucYear: true,
  pucPercent: true,
  degreePercent: true,
  degreeCollege: true,
  degreeUniversity: true,
  degreeName: true,
  degreeStream: true,
  priorDegreeType: true,
  priorDegreeYear: true,
  priorDegreeResultType: true,
  hasEntranceExams: true,
  entranceExams: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      examName: true,
      centreName: true,
      registrationNumber: true,
      scoreRank: true,
      examYear: true,
      sortOrder: true,
    },
  },
  referralFirstName: true,
  referralLastName: true,
  referralPhone: true,
  referralEmail: true,
  createdAt: true,
  university: { select: { id: true, name: true, code: true } },
  stream: { select: { id: true, name: true, programLevel: true, degreeType: true } },
  academicYear: { select: { id: true, label: true } },
} as const;

export type ConsultantLeadDetail = Prisma.AdmissionLeadGetPayload<{
  select: typeof consultantLeadDetailSelect;
}>;

export function normalizeEntranceExamsForDb(
  hasEntranceExams: boolean,
  exams: EntranceExamInput[] | undefined,
) {
  if (!hasEntranceExams || !exams?.length) return [];
  return exams.map((exam, index) => ({
    examName: exam.examName.trim(),
    centreName: exam.centreName.trim(),
    registrationNumber: exam.registrationNumber?.trim() || null,
    scoreRank: exam.scoreRank.trim(),
    examYear: parseOptionalInt(exam.examYear) ?? 0,
    sortOrder: index,
  }));
}

export async function replaceLeadEntranceExams(
  tx: Prisma.TransactionClient,
  leadId: string,
  hasEntranceExams: boolean,
  exams: EntranceExamInput[] | undefined,
) {
  await tx.leadEntranceExam.deleteMany({ where: { leadId } });
  const rows = normalizeEntranceExamsForDb(hasEntranceExams, exams);
  if (rows.length === 0) return;
  await tx.leadEntranceExam.createMany({ data: rows.map((row) => ({ ...row, leadId })) });
}
