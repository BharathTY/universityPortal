import type { EntranceExamFormRow, PriorDegreeFormValues } from "@/app/dashboard/consultant/leads/consultant-optional-education-sections";
import type { ConsultantStudentFormValues } from "@/app/dashboard/consultant/leads/consultant-student-form-fields";

export const INDIAN_MOBILE_DIGIT_LENGTH = 10;

export function digitsOnlyMobileInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, INDIAN_MOBILE_DIGIT_LENGTH);
}

function validateIndianMobileDigits(digits: string, requiredMessage: string): string | null {
  if (!digits) return requiredMessage;
  if (digits.length !== INDIAN_MOBILE_DIGIT_LENGTH) {
    return "Enter a valid 10-digit mobile number";
  }
  return null;
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function validateOptionalYearField(yearRaw: string, errorKey: string, e: Record<string, string>) {
  if (!yearRaw.trim()) return;
  const y = Number(yearRaw);
  const maxYear = new Date().getFullYear();
  if (!Number.isFinite(y) || y < 1980 || y > maxYear) {
    e[errorKey] = "Enter a valid year of passing";
  }
}

function validateOptionalScoreField(
  scoreRaw: string,
  resultType: string,
  errorKey: string,
  e: Record<string, string>,
) {
  if (!scoreRaw.trim() || !resultType) return;
  const n = Number(scoreRaw);
  if (resultType === "PERCENTAGE") {
    if (!Number.isFinite(n) || n < 0 || n > 100) e[errorKey] = "Percentage must be between 0 and 100";
  } else if (resultType === "CGPA") {
    if (!Number.isFinite(n) || n < 0 || n > 10) e[errorKey] = "CGPA must be between 0 and 10";
  }
}

/** Format-only checks when consultant partially fills education (all fields optional on create). */
function appendOptionalEducationFormatErrors(e: Record<string, string>, f: ConsultantStudentFormValues) {
  validateOptionalYearField(f.sslcYear, "sslcYear", e);
  validateOptionalScoreField(f.sslcPercent, f.sslcResultType, "sslcPercent", e);
  validateOptionalYearField(f.qualYear, "qualYear", e);
  validateOptionalScoreField(f.qualScore, f.qualResultType, "qualScore", e);
}

export function mapConsultantLeadApiFieldErrors(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0]!;
    else if (typeof v === "string") out[k] = v;
  }
  return out;
}

export function validateConsultantLeadForm(input: {
  form: ConsultantStudentFormValues;
  priorDegree: PriorDegreeFormValues;
  hasEntranceExams: boolean;
  entranceExams: EntranceExamFormRow[];
  streamId: string;
  academicYearId: string;
  programType: string;
  admissionDegreeType: string;
  refEmail: string;
  refPhone: string;
  academicYearsCount: number;
  streamsCount: number;
}): Record<string, string> {
  const e: Record<string, string> = {};
  const f = input.form;
  if (!f.firstName.trim()) e.firstName = "First name is required";
  if (!f.lastName.trim()) e.lastName = "Last name is required";
  const em = f.email.trim();
  if (!em) e.email = "Email is required";
  else if (!looksLikeEmail(em)) e.email = "Enter a valid email address";
  const mobDigits = f.mobile.replace(/\D/g, "");
  const mobileErr = validateIndianMobileDigits(mobDigits, "Mobile is required");
  if (mobileErr) e.mobile = mobileErr;
  if (!f.gender) e.gender = "Gender is required";
  if (!f.dateOfBirth) e.dateOfBirth = "Date of birth is required";
  if (!f.nationality.trim()) e.nationality = "Nationality is required";
  if (!f.guardianName.trim()) e.guardianName = "Parent / guardian name is required";
  const gMob = f.guardianMobile.replace(/\D/g, "");
  const guardianMobileErr = validateIndianMobileDigits(
    gMob,
    "Parent / guardian mobile is required",
  );
  if (guardianMobileErr) e.guardianMobile = guardianMobileErr;
  if (!f.admissionState) e.admissionState = "Select state";
  if (f.uidaiNumber.trim() && f.uidaiNumber.replace(/\D/g, "").length !== 12) {
    e.uidaiNumber = "UIDAI number must be 12 digits";
  }
  if (!f.addressLine1.trim()) e.addressLine1 = "Address line 1 is required";
  if (!f.city.trim()) e.city = "City is required";
  if (!f.district.trim()) e.district = "District is required";
  if (!f.state) e.state = "Select state";
  if (!f.country.trim()) e.country = "Country is required";
  if (!f.pincode.trim() || f.pincode.replace(/\D/g, "").length !== 6) e.pincode = "PIN code must be 6 digits";
  if (!f.correspondenceAddress.trim()) e.correspondenceAddress = "Correspondence address is required";
  appendOptionalEducationFormatErrors(e, f);
  if (!input.programType) e.programType = "Select program type";
  if (!input.admissionDegreeType) e.admissionDegreeType = "Select degree type";
  if (input.streamsCount === 0 || !input.streamId) e.streamId = "Select a program name";
  const pd = input.priorDegree;
  if (pd.priorDegreeYear.trim()) {
    const y = Number(pd.priorDegreeYear);
    const maxYear = new Date().getFullYear();
    if (!Number.isFinite(y) || y < 1980 || y > maxYear) {
      e.priorDegreeYear = "Enter a valid year of passing";
    }
  }
  if (pd.priorDegreeScore.trim() && pd.priorDegreeResultType === "PERCENTAGE") {
    const n = Number(pd.priorDegreeScore);
    if (!Number.isFinite(n) || n < 0 || n > 100) e.priorDegreeScore = "Percentage must be between 0 and 100";
  } else if (pd.priorDegreeScore.trim() && pd.priorDegreeResultType === "CGPA") {
    const n = Number(pd.priorDegreeScore);
    if (!Number.isFinite(n) || n < 0 || n > 10) e.priorDegreeScore = "CGPA must be between 0 and 10";
  }
  if (input.hasEntranceExams) {
    if (input.entranceExams.length === 0) {
      e.entranceExams = "Add at least one entrance examination record";
    } else {
      input.entranceExams.forEach((exam, index) => {
        if (!exam.examName.trim()) e[`entranceExams.${index}.examName`] = "Examination name is required";
        if (!exam.centreName.trim()) e[`entranceExams.${index}.centreName`] = "Examination centre name is required";
        if (!exam.scoreRank.trim()) e[`entranceExams.${index}.scoreRank`] = "Score / rank is required";
        if (!exam.examYear.trim()) {
          e[`entranceExams.${index}.examYear`] = "Year of examination is required";
        } else {
          const y = Number(exam.examYear);
          const maxYear = new Date().getFullYear();
          if (!Number.isFinite(y) || y < 1980 || y > maxYear) {
            e[`entranceExams.${index}.examYear`] = "Enter a valid year of examination";
          }
        }
      });
    }
  }
  if (input.academicYearsCount === 0) {
    e.academicYearId = "No academic year is configured for this university";
  } else if (!input.academicYearId) {
    e.academicYearId = "Select an academic year";
  }
  const rE = input.refEmail.trim();
  if (rE && !looksLikeEmail(rE)) e.referralEmail = "Enter a valid email address";
  const rP = input.refPhone.trim();
  if (rP && rP.replace(/\D/g, "").length < 10) e.referralPhone = "Enter at least 10 digits for contact";
  return e;
}
