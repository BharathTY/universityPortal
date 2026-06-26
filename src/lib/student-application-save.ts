import { Prisma } from "@prisma/client";
import { higherQualificationShowsBoardField } from "@/lib/student-form-options";
import type { StudentProfileFormValues } from "@/lib/student-lead-prefill";
import { splitStudentFullName } from "@/lib/student-full-name";
import { correspondenceFromCurrentForm } from "@/lib/student-address";

export function parseOptionalDate(value: string | null | undefined): Date | null {
  if (value == null || value.trim() === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseOptionalDecimal(value: string | null | undefined): Prisma.Decimal | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return new Prisma.Decimal(n);
}

export function parseOptionalInt(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function buildStudentProfileUpdates(values: StudentProfileFormValues) {
  const { firstName, lastName } = splitStudentFullName(values.fullName);
  const name = values.fullName.trim();
  return {
    user: {
      name,
      phone: values.mobile.trim(),
      gender: values.gender.trim() || null,
      dateOfBirth: parseOptionalDate(values.dateOfBirth),
      pincode: values.pincode.trim() || null,
      districtStudent: values.district.trim() || null,
      stateStudent: values.state.trim() || null,
      sslcSchool: values.sslcSchool.trim() || null,
      sslcBoard: values.sslcBoard.trim() || null,
      sslcPercent: parseOptionalDecimal(values.sslcPercent),
      pucType: values.qualificationType || null,
      pucInstitution: values.qualInstitution.trim() || null,
      pucYear: parseOptionalInt(values.qualYear),
      pucPercent: parseOptionalDecimal(values.qualScore),
      degreeName: values.priorDegreeName.trim() || null,
      degreeStream: values.priorDegreeStream.trim() || null,
      degreeCollege: values.priorDegreeCollege.trim() || null,
      degreeUniversity: values.priorDegreeUniversity.trim() || null,
      degreePercent: parseOptionalDecimal(values.priorDegreeScore),
    } satisfies Prisma.UserUpdateInput,
    lead: {
      studentTitle: values.studentTitle.trim() || null,
      firstName,
      lastName,
      mobile: values.mobile.trim(),
      gender: values.gender.trim() || null,
      dateOfBirth: parseOptionalDate(values.dateOfBirth),
      category: values.category.trim() || null,
      caste: values.caste.trim() || null,
      religion: values.religion.trim() || null,
      nationality: values.nationality.trim() || null,
      fatherName: values.guardianName.trim() || null,
      fatherMobile: values.guardianMobile.trim() || null,
      uidaiNumber: values.uidaiNumber.replace(/\D/g, "") || null,
      abcApaarId: values.abcApaarId.trim() || null,
      admissionState: values.admissionState.trim() || null,
      address: values.addressLine1.trim() || null,
      addressLine1: values.addressLine1.trim() || null,
      addressLine2: values.addressLine2.trim() || null,
      city: values.city.trim() || null,
      district: values.district.trim() || null,
      state: values.state.trim() || null,
      country: values.country.trim() || null,
      pincode: values.pincode.replace(/\D/g, "") || null,
      correspondenceAddress: correspondenceFromCurrentForm(values),
      sslcSchool: values.sslcSchool.trim() || null,
      sslcBoard: values.sslcBoard.trim() || null,
      sslcYear: parseOptionalInt(values.sslcYear),
      sslcResultType: values.sslcResultType || null,
      sslcPercent: parseOptionalDecimal(values.sslcPercent),
      qualificationType: values.qualificationType || null,
      qualInstitution: values.qualInstitution.trim() || null,
      qualBoardUniversity: higherQualificationShowsBoardField(values.qualificationType)
        ? values.qualBoardUniversity.trim() || null
        : null,
      qualYear: parseOptionalInt(values.qualYear),
      qualResultType: values.qualResultType || null,
      qualScore: parseOptionalDecimal(values.qualScore),
      priorDegreeType: values.priorDegreeType.trim() || null,
      priorDegreeYear: parseOptionalInt(values.priorDegreeYear),
      priorDegreeResultType: values.priorDegreeResultType || null,
      degreeName: values.priorDegreeName.trim() || null,
      degreeStream: values.priorDegreeStream.trim() || null,
      degreeCollege: values.priorDegreeCollege.trim() || null,
      degreeUniversity: values.priorDegreeUniversity.trim() || null,
      degreePercent: parseOptionalDecimal(values.priorDegreeScore),
      hasEntranceExams: values.hasEntranceExams,
      referralFirstName: values.referralFirstName.trim() || null,
      referralLastName: values.referralLastName.trim() || null,
      referralPhone: values.referralPhone.trim() || null,
      referralEmail: values.referralEmail.trim().toLowerCase() || null,
    } satisfies Prisma.AdmissionLeadUpdateInput,
    entranceExams: values.hasEntranceExams
      ? values.entranceExams.map((e, i) => ({
          examName: e.examName.trim(),
          centreName: "",
          registrationNumber: null,
          scoreRank: e.scoreRank.trim(),
          examYear: parseOptionalInt(e.examYear) ?? 0,
          sortOrder: i,
        }))
      : [],
  };
}
