import {
  HIGHER_QUALIFICATION_TYPES,
  higherQualificationShowsBoardField,
  SSLC_RESULT_TYPES,
} from "@/lib/student-form-options";

export type EntranceExamFormRow = {
  clientId: string;
  examName: string;
  centreName: string;
  registrationNumber: string;
  scoreRank: string;
  examYear: string;
};

export type StudentProfileFormValues = {
  studentTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  category: string;
  caste: string;
  religion: string;
  nationality: string;
  mobile: string;
  guardianName: string;
  guardianMobile: string;
  uidaiNumber: string;
  abcApaarId: string;
  admissionState: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
  correspondenceAddress: string;
  sslcSchool: string;
  sslcBoard: string;
  sslcYear: string;
  sslcResultType: string;
  sslcPercent: string;
  qualificationType: string;
  qualInstitution: string;
  qualBoardUniversity: string;
  qualYear: string;
  qualResultType: string;
  qualScore: string;
  priorDegreeType: string;
  priorDegreeName: string;
  priorDegreeStream: string;
  priorDegreeCollege: string;
  priorDegreeUniversity: string;
  priorDegreeYear: string;
  priorDegreeResultType: string;
  priorDegreeScore: string;
  hasEntranceExams: boolean;
  entranceExams: EntranceExamFormRow[];
};

export type StudentProfilePrefill = StudentProfileFormValues & {
  photoUrl: string | null;
  sslcMarksCardUrl: string | null;
  qualMarksCardUrl: string | null;
  universityName: string;
  programType: string;
  degreeType: string;
  programName: string;
  academicYear: string;
};

export const PHOTO_UPLOAD_GUIDELINES = [
  "Please upload the passport-size photo",
  "Upload a photo with only face",
  "Don't upload photo with full body",
  "Please avoid selfies",
] as const;

function splitName(name: string | null | undefined): [string, string] {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return [parts[0] ?? "", parts.slice(1).join(" ")];
}

function isoToDateInput(iso: Date | string | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function decimalStr(v: unknown): string {
  if (v == null || v === "") return "";
  const n = Number(String(v));
  return Number.isFinite(n) ? String(n) : "";
}

function pickStr(...values: (string | null | undefined)[]): string {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return "";
}

type LeadRow = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobile?: string | null;
  studentTitle?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | string | null;
  category?: string | null;
  caste?: string | null;
  religion?: string | null;
  nationality?: string | null;
  fatherName?: string | null;
  fatherMobile?: string | null;
  uidaiNumber?: string | null;
  abcApaarId?: string | null;
  admissionState?: string | null;
  address?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  correspondenceAddress?: string | null;
  sslcSchool?: string | null;
  sslcBoard?: string | null;
  sslcYear?: number | null;
  sslcResultType?: string | null;
  sslcPercent?: unknown;
  sslcMarksCardUrl?: string | null;
  qualificationType?: string | null;
  qualInstitution?: string | null;
  qualBoardUniversity?: string | null;
  qualYear?: number | null;
  qualResultType?: string | null;
  qualScore?: unknown;
  qualMarksCardUrl?: string | null;
  pucBoard?: string | null;
  pucYear?: number | null;
  pucPercent?: unknown;
  priorDegreeType?: string | null;
  priorDegreeYear?: number | null;
  priorDegreeResultType?: string | null;
  degreeName?: string | null;
  degreeStream?: string | null;
  degreeCollege?: string | null;
  degreeUniversity?: string | null;
  degreePercent?: unknown;
  programInterest?: string | null;
  admissionDegreeType?: string | null;
  photoUrl?: string | null;
  hasEntranceExams?: boolean | null;
  entranceExams?: {
    id: string;
    examName: string;
    centreName: string;
    registrationNumber: string | null;
    scoreRank: string;
    examYear: number;
  }[];
  stream?: { name?: string | null; programLevel?: string | null; degreeType?: string | null } | null;
  academicYear?: { label?: string | null } | null;
  university?: { name?: string | null } | null;
};

type UserRow = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | string | null;
  pincode?: string | null;
  districtStudent?: string | null;
  stateStudent?: string | null;
  sslcSchool?: string | null;
  sslcBoard?: string | null;
  sslcPercent?: unknown;
  pucType?: string | null;
  pucInstitution?: string | null;
  pucYear?: number | null;
  pucPercent?: unknown;
  degreeName?: string | null;
  degreeStream?: string | null;
  degreeCollege?: string | null;
  degreeUniversity?: string | null;
  degreePercent?: unknown;
};

export function mergeStudentProfilePrefill(
  user: UserRow,
  lead: LeadRow | null,
  universityName: string,
): StudentProfilePrefill {
  const [nameFn, nameLn] = splitName(user.name);
  const qualInstitution = pickStr(lead?.qualInstitution, lead?.degreeCollege);
  const qualBoard = pickStr(lead?.qualBoardUniversity, lead?.pucBoard, lead?.degreeUniversity);
  const qualYear = lead?.qualYear ?? lead?.pucYear;
  const qualScore = lead?.qualScore ?? lead?.pucPercent ?? lead?.degreePercent;
  const qualResultType = pickStr(
    lead?.qualResultType,
    qualScore != null && qualScore !== "" ? "PERCENTAGE" : "",
  );

  return {
    studentTitle: pickStr(lead?.studentTitle),
    firstName: pickStr(lead?.firstName, nameFn),
    lastName: pickStr(lead?.lastName, nameLn),
    email: pickStr(user.email, lead?.email),
    gender: pickStr(user.gender, lead?.gender),
    dateOfBirth: isoToDateInput(user.dateOfBirth) || isoToDateInput(lead?.dateOfBirth),
    category: pickStr(lead?.category),
    caste: pickStr(lead?.caste),
    religion: pickStr(lead?.religion),
    nationality: pickStr(lead?.nationality, "India"),
    mobile: pickStr(user.phone, lead?.mobile),
    guardianName: pickStr(lead?.fatherName),
    guardianMobile: pickStr(lead?.fatherMobile),
    uidaiNumber: pickStr(lead?.uidaiNumber),
    abcApaarId: pickStr(lead?.abcApaarId),
    admissionState: pickStr(lead?.admissionState),
    addressLine1: pickStr(lead?.addressLine1, lead?.address),
    addressLine2: pickStr(lead?.addressLine2),
    city: pickStr(lead?.city),
    district: pickStr(user.districtStudent, lead?.district),
    state: pickStr(user.stateStudent, lead?.state),
    country: pickStr(lead?.country, "India"),
    pincode: pickStr(user.pincode, lead?.pincode),
    correspondenceAddress: pickStr(lead?.correspondenceAddress),
    sslcSchool: pickStr(user.sslcSchool, lead?.sslcSchool),
    sslcBoard: pickStr(user.sslcBoard, lead?.sslcBoard),
    sslcYear: lead?.sslcYear != null ? String(lead.sslcYear) : "",
    sslcResultType: pickStr(lead?.sslcResultType, lead?.sslcPercent != null ? "PERCENTAGE" : ""),
    sslcPercent: decimalStr(user.sslcPercent) || decimalStr(lead?.sslcPercent),
    qualificationType: pickStr(lead?.qualificationType, user.pucType, "PUC"),
    qualInstitution: pickStr(user.pucInstitution, qualInstitution),
    qualBoardUniversity: qualBoard,
    qualYear: qualYear != null ? String(qualYear) : user.pucYear != null ? String(user.pucYear) : "",
    qualResultType: pickStr(lead?.qualResultType) || (qualScore != null && qualScore !== "" ? "PERCENTAGE" : ""),
    qualScore: decimalStr(lead?.qualScore) || decimalStr(lead?.pucPercent) || decimalStr(user.pucPercent),
    priorDegreeType: pickStr(lead?.priorDegreeType),
    priorDegreeName: pickStr(user.degreeName, lead?.degreeName),
    priorDegreeStream: pickStr(user.degreeStream, lead?.degreeStream),
    priorDegreeCollege: pickStr(user.degreeCollege, lead?.degreeCollege),
    priorDegreeUniversity: pickStr(user.degreeUniversity, lead?.degreeUniversity),
    priorDegreeYear: lead?.priorDegreeYear != null ? String(lead.priorDegreeYear) : "",
    priorDegreeResultType: pickStr(lead?.priorDegreeResultType),
    priorDegreeScore: decimalStr(user.degreePercent) || decimalStr(lead?.degreePercent),
    hasEntranceExams: Boolean(lead?.hasEntranceExams),
    entranceExams: (lead?.entranceExams ?? []).map((e) => ({
      clientId: e.id,
      examName: e.examName,
      centreName: e.centreName,
      registrationNumber: e.registrationNumber ?? "",
      scoreRank: e.scoreRank,
      examYear: String(e.examYear),
    })),
    photoUrl: lead?.photoUrl ?? null,
    sslcMarksCardUrl: lead?.sslcMarksCardUrl ?? null,
    qualMarksCardUrl: lead?.qualMarksCardUrl ?? null,
    universityName,
    programType: lead?.programInterest ?? lead?.stream?.programLevel ?? "",
    degreeType: lead?.admissionDegreeType ?? lead?.stream?.degreeType ?? "",
    programName: lead?.stream?.name ?? "",
    academicYear: lead?.academicYear?.label ?? "",
  };
}

export function createEmptyStudentProfile(): StudentProfileFormValues {
  return {
    studentTitle: "",
    firstName: "",
    lastName: "",
    email: "",
    gender: "",
    dateOfBirth: "",
    category: "",
    caste: "",
    religion: "",
    nationality: "India",
    mobile: "",
    guardianName: "",
    guardianMobile: "",
    uidaiNumber: "",
    abcApaarId: "",
    admissionState: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    state: "",
    country: "India",
    pincode: "",
    correspondenceAddress: "",
    sslcSchool: "",
    sslcBoard: "",
    sslcYear: "",
    sslcResultType: "",
    sslcPercent: "",
    qualificationType: "",
    qualInstitution: "",
    qualBoardUniversity: "",
    qualYear: "",
    qualResultType: "",
    qualScore: "",
    priorDegreeType: "",
    priorDegreeName: "",
    priorDegreeStream: "",
    priorDegreeCollege: "",
    priorDegreeUniversity: "",
    priorDegreeYear: "",
    priorDegreeResultType: "",
    priorDegreeScore: "",
    hasEntranceExams: false,
    entranceExams: [],
  };
}

export function validateStudentProfileSubmit(profile: StudentProfilePrefill): Record<string, string> {
  const e: Record<string, string> = {};
  const values = profile;

  if (!profile.photoUrl) e.photoUrl = "Student photograph is required before submitting your profile";

  if (!values.sslcSchool.trim()) e.sslcSchool = "School name is required";
  if (!values.sslcBoard.trim()) e.sslcBoard = "Board name is required";
  if (!values.sslcYear.trim()) e.sslcYear = "Year of passing is required";
  if (!values.sslcResultType) e.sslcResultType = "Result type is required";
  if (!values.sslcPercent.trim()) e.sslcPercent = "Score is required";

  if (!values.qualificationType) e.qualificationType = "Qualification type is required";
  if (!values.qualInstitution.trim()) e.qualInstitution = "Institution name is required";
  if (
    higherQualificationShowsBoardField(values.qualificationType) &&
    !values.qualBoardUniversity.trim()
  ) {
    e.qualBoardUniversity = "Board / university name is required";
  }
  if (!values.qualYear.trim()) e.qualYear = "Year of passing is required";
  if (!values.qualResultType) e.qualResultType = "Result type is required";
  if (!values.qualScore.trim()) e.qualScore = "Score is required";

  if (!profile.programType) e.programType = "Program type is required";
  if (!profile.degreeType) e.degreeType = "Degree type is required";
  if (!profile.programName) e.programName = "Program name is required";

  if (values.hasEntranceExams) {
    values.entranceExams.forEach((exam, i) => {
      if (!exam.examName.trim()) e[`entranceExams.${i}.examName`] = "Examination name is required";
      if (!exam.centreName.trim()) e[`entranceExams.${i}.centreName`] = "Examination centre is required";
      if (!exam.scoreRank.trim()) e[`entranceExams.${i}.scoreRank`] = "Score / rank is required";
      if (!exam.examYear.trim()) e[`entranceExams.${i}.examYear`] = "Year of examination is required";
    });
  }

  return e;
}

export function isStudentProfileComplete(profile: StudentProfilePrefill): boolean {
  return Object.keys(validateStudentProfileSubmit(profile)).length === 0;
}

export function qualificationLabel(value: string): string {
  return HIGHER_QUALIFICATION_TYPES.find((q) => q.value === value)?.label ?? value;
}

export function resultTypeLabel(value: string): string {
  return SSLC_RESULT_TYPES.find((r) => r.value === value)?.label ?? value;
}
