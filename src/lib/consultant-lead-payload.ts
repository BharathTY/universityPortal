import { Prisma } from "@prisma/client";
import { z } from "zod";

export const optionalDecimal = z.union([z.number(), z.string()]).optional().nullable();
export const optionalInt = z.union([z.number().int(), z.string()]).optional().nullable();

export const consultantLeadBodySchema = z.object({
  universityId: z.string().min(1).optional(),
  academicYearId: z.string().min(1).optional(),
  streamId: z.string().min(1),
  firstName: z.string().min(1).max(120).trim(),
  lastName: z.string().min(1).max(120).trim(),
  email: z.string().email().max(254).trim(),
  mobile: z
    .string()
    .trim()
    .refine((s) => {
      const digits = s.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    }, { message: "Enter a valid mobile number (10–15 digits)" }),
  nationality: z.string().max(120).trim().optional().nullable(),
  admissionState: z.string().min(1).max(120).trim(),
  address: z.string().min(1).max(1000).trim(),
  gender: z.string().max(32).trim().optional().nullable(),
  dateOfBirth: z.string().max(32).optional().nullable(),
  pincode: z.string().max(12).trim().optional().nullable(),
  pucBoard: z.string().max(120).trim().optional().nullable(),
  pucYear: optionalInt,
  pucPercent: optionalDecimal,
  degreePercent: optionalDecimal,
  degreeCollege: z.string().max(200).trim().optional().nullable(),
  degreeName: z.string().max(200).trim().optional().nullable(),
  ieltsScore: z.string().max(32).trim().optional().nullable(),
  toeflScore: z.string().max(32).trim().optional().nullable(),
  referralFirstName: z.string().max(120).trim().optional().nullable(),
  referralLastName: z.string().max(120).trim().optional().nullable(),
  referralPhone: z.string().max(32).trim().optional().nullable(),
  referralEmail: z.string().max(254).trim().optional().nullable(),
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
    if (!ok.success) {
      throw new Error("INVALID_REFERRAL_EMAIL");
    }
    referralEmail = refE.toLowerCase();
  }

  const refPhone = data.referralPhone?.trim();
  if (refPhone && refPhone.replace(/\D/g, "").length < 10) {
    throw new Error("INVALID_REFERRAL_PHONE");
  }

  return {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email.toLowerCase(),
    mobile: data.mobile,
    nationality: data.nationality ?? null,
    admissionState: data.admissionState,
    address: data.address,
    gender: data.gender?.trim() || null,
    dateOfBirth: parseOptionalDate(data.dateOfBirth),
    pincode: data.pincode?.trim() || null,
    pucBoard: data.pucBoard?.trim() || null,
    pucYear: parseOptionalInt(data.pucYear),
    pucPercent: parseOptionalDecimal(data.pucPercent),
    degreePercent: parseOptionalDecimal(data.degreePercent),
    degreeCollege: data.degreeCollege?.trim() || null,
    degreeName: data.degreeName?.trim() || null,
    ieltsScore: data.ieltsScore?.trim() || null,
    toeflScore: data.toeflScore?.trim() || null,
    referralFirstName: data.referralFirstName?.trim() || null,
    referralLastName: data.referralLastName?.trim() || null,
    referralPhone: data.referralPhone?.trim() || null,
    referralEmail,
  };
}

export async function parseConsultantLeadRequest(
  req: Request,
): Promise<{ data: unknown; photoFile: File | null }> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const payloadRaw = form.get("payload");
    const photoFile = form.get("photoFile");
    if (typeof payloadRaw !== "string") {
      throw new Error("Missing payload");
    }
    return {
      data: JSON.parse(payloadRaw) as unknown,
      photoFile: photoFile instanceof File && photoFile.size > 0 ? photoFile : null,
    };
  }
  return { data: await req.json(), photoFile: null };
}

export type SerializedConsultantLeadDetail = {
  id: string;
  universityId: string;
  academicYearId: string;
  streamId: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  nationality: string | null;
  admissionState: string;
  address: string;
  photoUrl: string | null;
  gender: string | null;
  dateOfBirth: string;
  pincode: string | null;
  pucBoard: string | null;
  pucYear: number | null;
  pucPercent: string;
  degreePercent: string;
  degreeCollege: string | null;
  degreeName: string | null;
  ieltsScore: string | null;
  toeflScore: string | null;
  referralFirstName: string | null;
  referralLastName: string | null;
  referralPhone: string | null;
  referralEmail: string | null;
};

export function serializeConsultantLeadForClient(lead: ConsultantLeadDetail): SerializedConsultantLeadDetail {
  return {
    id: lead.id,
    universityId: lead.universityId,
    academicYearId: lead.academicYearId,
    streamId: lead.streamId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    mobile: lead.mobile,
    nationality: lead.nationality,
    admissionState: lead.admissionState ?? "",
    address: lead.address ?? "",
    photoUrl: lead.photoUrl,
    gender: lead.gender,
    dateOfBirth: dateToInput(lead.dateOfBirth),
    pincode: lead.pincode,
    pucBoard: lead.pucBoard,
    pucYear: lead.pucYear,
    pucPercent: decimalToInput(lead.pucPercent),
    degreePercent: decimalToInput(lead.degreePercent),
    degreeCollege: lead.degreeCollege,
    degreeName: lead.degreeName,
    ieltsScore: lead.ieltsScore,
    toeflScore: lead.toeflScore,
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
  firstName: true,
  lastName: true,
  email: true,
  mobile: true,
  nationality: true,
  admissionState: true,
  admissionStatus: true,
  pipelineStatus: true,
  address: true,
  photoUrl: true,
  gender: true,
  dateOfBirth: true,
  pincode: true,
  pucBoard: true,
  pucYear: true,
  pucPercent: true,
  degreePercent: true,
  degreeCollege: true,
  degreeName: true,
  ieltsScore: true,
  toeflScore: true,
  referralFirstName: true,
  referralLastName: true,
  referralPhone: true,
  referralEmail: true,
  createdAt: true,
  university: { select: { id: true, name: true, code: true } },
  stream: { select: { id: true, name: true } },
  academicYear: { select: { id: true, label: true } },
} as const;

export type ConsultantLeadDetail = Prisma.AdmissionLeadGetPayload<{
  select: typeof consultantLeadDetailSelect;
}>;
