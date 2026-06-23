"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ConsultantAdmissionDetailsSection } from "@/app/dashboard/consultant/leads/consultant-admission-details-section";
import {
  ConsultantEntranceExamsSection,
  ConsultantOtherEducationSection,
  createEmptyEntranceExamRow,
  createEmptyPriorDegreeValues,
  type EntranceExamFormRow,
  type PriorDegreeFormValues,
} from "@/app/dashboard/consultant/leads/consultant-optional-education-sections";
import {
  ConsultantStudentFormFields,
  createEmptyStudentFormValues,
  type ConsultantStudentFormValues,
} from "@/app/dashboard/consultant/leads/consultant-student-form-fields";
import { ConsultantBulkCsvPanel } from "@/components/consultant-bulk-csv-panel";
import { ListQueryToolbar, SORT_LEADS } from "@/components/list-controls";
import type { SerializedConsultantLeadDetail } from "@/lib/consultant-lead-payload";
import { newClientId } from "@/lib/client-id";
import type { StudentPhotoUploadRef } from "@/components/student-photo-upload-field";

type Stream = { id: string; name: string; programLevel?: "UG" | "PG" | null; degreeType?: string | null };
type AcademicYearOption = { id: string; label: string };

type UniversityOption = {
  id: string;
  name: string;
  code: string;
  streams: Stream[];
  academicYears: AcademicYearOption[];
};

type LeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  pipelineStatus: string;
  createdAt: string;
  admissionState: string | null;
  referralFirstName: string | null;
  referralLastName: string | null;
  referralPhone: string | null;
  referralEmail: string | null;
  branchName: string | null;
  university: { name: string; code: string };
  stream: { name: string };
  /** Present only for Manager / Admin / Counsellor / Master API responses. */
  assignedPartnerDisplayName?: string | null;
};

type ConsultantLeadsClientProps = {
  universityId: string;
  universityName: string;
  universityCode: string;
  streams: Stream[];
  academicYears?: AcademicYearOption[];
  /** All assignable universities for the add-lead form dropdown. */
  universityOptions?: UniversityOption[];
  initialUniversityId?: string;
  /** POST `/api/auth/active-university` when the scoped university changes (multi-university consultants). */
  setActiveUniversityOnMount?: boolean;
  showBulkUpload?: boolean;
  /** `hub`: leads table under the university hub; `addOnly`: full-page add lead form; `edit`: edit existing lead */
  layoutMode: "hub" | "addOnly" | "edit";
  leadId?: string;
  initialLead?: SerializedConsultantLeadDetail;
};

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function mapApiFieldErrors(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0]!;
    else if (typeof v === "string") out[k] = v;
  }
  return out;
}

function validateLeadForm(input: {
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
  const mob = f.mobile.trim();
  const mobDigits = mob.replace(/\D/g, "");
  if (!mob) e.mobile = "Mobile is required";
  else if (mobDigits.length < 10 || mobDigits.length > 15) e.mobile = "Enter a valid mobile number (10–15 digits)";
  if (!f.gender) e.gender = "Gender is required";
  if (!f.dateOfBirth) e.dateOfBirth = "Date of birth is required";
  if (!f.nationality.trim()) e.nationality = "Nationality is required";
  if (!f.guardianName.trim()) e.guardianName = "Parent / guardian name is required";
  const gMob = f.guardianMobile.replace(/\D/g, "");
  if (!f.guardianMobile.trim()) e.guardianMobile = "Parent / guardian mobile is required";
  else if (gMob.length < 10) e.guardianMobile = "Enter a valid mobile number";
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
  if (!f.sslcSchool.trim()) e.sslcSchool = "School name is required";
  if (!f.sslcBoard) e.sslcBoard = "Select board";
  if (!f.sslcYear.trim()) e.sslcYear = "Year of passing is required";
  if (!f.sslcResultType) e.sslcResultType = "Select result type";
  if (!f.sslcPercent.trim()) e.sslcPercent = "Score is required";
  else if (f.sslcResultType === "PERCENTAGE") {
    const n = Number(f.sslcPercent);
    if (!Number.isFinite(n) || n < 0 || n > 100) e.sslcPercent = "Percentage must be between 0 and 100";
  } else if (f.sslcResultType === "CGPA") {
    const n = Number(f.sslcPercent);
    if (!Number.isFinite(n) || n < 0 || n > 10) e.sslcPercent = "CGPA must be between 0 and 10";
  }
  if (!f.qualificationType) e.qualificationType = "Select qualification";
  if (!f.qualInstitution.trim()) e.qualInstitution = "Institution name is required";
  if (!f.qualBoardUniversity.trim()) e.qualBoardUniversity = "Board / university name is required";
  if (!f.qualYear.trim()) e.qualYear = "Year of passing is required";
  if (!f.qualResultType) e.qualResultType = "Select result type";
  if (!f.qualScore.trim()) e.qualScore = "Score is required";
  else if (f.qualResultType === "PERCENTAGE") {
    const n = Number(f.qualScore);
    if (!Number.isFinite(n) || n < 0 || n > 100) e.qualScore = "Percentage must be between 0 and 100";
  } else if (f.qualResultType === "CGPA") {
    const n = Number(f.qualScore);
    if (!Number.isFinite(n) || n < 0 || n > 10) e.qualScore = "CGPA must be between 0 and 10";
  }
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

export type { ConsultantLeadsClientProps };

export function ConsultantLeadsClient(props: ConsultantLeadsClientProps) {
  const showBulk = props.showBulkUpload ?? false;
  const setActive = props.setActiveUniversityOnMount ?? false;
  const universityOptions = props.universityOptions ?? [];
  const isEdit = props.layoutMode === "edit";
  const isAddOnly = props.layoutMode === "addOnly";
  const useExtendedFields = isAddOnly || isEdit;
  const hasUniversityPicker = (isAddOnly || isEdit) && universityOptions.length > 1;

  const [selectedUniversityId, setSelectedUniversityId] = React.useState(
    props.initialUniversityId ?? props.universityId,
  );

  const activeUniversity = React.useMemo(() => {
    if (hasUniversityPicker) {
      return universityOptions.find((u) => u.id === selectedUniversityId) ?? universityOptions[0]!;
    }
    return {
      id: props.universityId,
      name: props.universityName,
      code: props.universityCode,
      streams: props.streams,
      academicYears: props.academicYears ?? [],
    };
  }, [
    hasUniversityPicker,
    universityOptions,
    selectedUniversityId,
    props.universityId,
    props.universityName,
    props.universityCode,
    props.streams,
    props.academicYears,
  ]);

  const activeStreams = activeUniversity.streams;
  const academicYears = activeUniversity.academicYears;
  const activeUniversityId = activeUniversity.id;
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "latest";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? "20") || 20));

  const [loading, setLoading] = React.useState(props.layoutMode === "hub");
  const [deleting, setDeleting] = React.useState(false);
  const [rows, setRows] = React.useState<LeadRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);

  const [studentForm, setStudentForm] = React.useState<ConsultantStudentFormValues>(createEmptyStudentFormValues);
  const [priorDegree, setPriorDegree] = React.useState<PriorDegreeFormValues>(createEmptyPriorDegreeValues);
  const [hasEntranceExams, setHasEntranceExams] = React.useState(false);
  const [entranceExams, setEntranceExams] = React.useState<EntranceExamFormRow[]>([]);
  const [streamId, setStreamId] = React.useState(props.initialLead?.streamId ?? "");
  const [academicYearId, setAcademicYearId] = React.useState(
    props.initialLead?.academicYearId ?? props.academicYears?.[0]?.id ?? "",
  );
  const [programType, setProgramType] = React.useState(props.initialLead?.programType ?? "");
  const [admissionDegreeType, setAdmissionDegreeType] = React.useState(
    props.initialLead?.admissionDegreeType ?? "",
  );
  const [refFn, setRefFn] = React.useState("");
  const [refLn, setRefLn] = React.useState("");
  const [refPhone, setRefPhone] = React.useState("");
  const [refEmail, setRefEmail] = React.useState("");
  const photoUploadRef = React.useRef<StudentPhotoUploadRef | null>(null);
  const [sslcMarksCardFile, setSslcMarksCardFile] = React.useState<File | null>(null);
  const [qualMarksCardFile, setQualMarksCardFile] = React.useState<File | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = React.useState<string | null>(
    props.initialLead?.photoUrl ?? null,
  );
  const [existingSslcMarksCardUrl, setExistingSslcMarksCardUrl] = React.useState<string | null>(
    props.initialLead?.sslcMarksCardUrl ?? null,
  );
  const [existingQualMarksCardUrl, setExistingQualMarksCardUrl] = React.useState<string | null>(
    props.initialLead?.qualMarksCardUrl ?? null,
  );
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  function updatePriorDegree<K extends keyof PriorDegreeFormValues>(key: K, value: PriorDegreeFormValues[K]) {
    setPriorDegree((prev) => ({ ...prev, [key]: value }));
  }

  function updateStudentForm<K extends keyof ConsultantStudentFormValues>(
    key: K,
    value: ConsultantStudentFormValues[K],
  ) {
    setStudentForm((prev) => ({ ...prev, [key]: value }));
  }

  function clearStudentFieldError(key: string) {
    setFieldErrors((f) => {
      const n = { ...f };
      delete n[key];
      return n;
    });
  }

  React.useEffect(() => {
    if (!isEdit || !props.initialLead) return;
    const l = props.initialLead;
    setSelectedUniversityId(l.universityId);
    setStreamId(l.streamId);
    setAcademicYearId(l.academicYearId);
    setRefFn(l.referralFirstName ?? "");
    setRefLn(l.referralLastName ?? "");
    setRefPhone(l.referralPhone ?? "");
    setRefEmail(l.referralEmail ?? "");
    setExistingPhotoUrl(l.photoUrl);
    setExistingSslcMarksCardUrl(l.sslcMarksCardUrl);
    setExistingQualMarksCardUrl(l.qualMarksCardUrl);
    setProgramType(l.programType ?? "");
    setAdmissionDegreeType(l.admissionDegreeType ?? "");
    setPriorDegree({
      priorDegreeType: l.priorDegreeType ?? "",
      priorDegreeName: l.priorDegreeName ?? "",
      priorDegreeStream: l.priorDegreeStream ?? "",
      priorDegreeCollege: l.priorDegreeCollege ?? "",
      priorDegreeUniversity: l.priorDegreeUniversity ?? "",
      priorDegreeYear: l.priorDegreeYear != null ? String(l.priorDegreeYear) : "",
      priorDegreeResultType: l.priorDegreeResultType ?? "",
      priorDegreeScore: l.priorDegreeScore,
    });
    setHasEntranceExams(l.hasEntranceExams);
    setEntranceExams(
      l.entranceExams.length > 0
        ? l.entranceExams.map((exam) => ({
            clientId: exam.id ?? newClientId("exam"),
            examName: exam.examName,
            centreName: exam.centreName,
            registrationNumber: exam.registrationNumber ?? "",
            scoreRank: exam.scoreRank,
            examYear: String(exam.examYear),
          }))
        : [],
    );
    setStudentForm({
      studentTitle: l.studentTitle ?? "",
      firstName: l.firstName,
      lastName: l.lastName,
      email: l.email,
      mobile: l.mobile,
      gender: l.gender ?? "",
      dateOfBirth: l.dateOfBirth,
      category: l.category ?? "",
      caste: l.caste ?? "",
      religion: l.religion ?? "",
      nationality: l.nationality ?? "India",
      guardianName: l.guardianName ?? "",
      guardianMobile: l.guardianMobile ?? "",
      uidaiNumber: l.uidaiNumber ?? "",
      abcApaarId: l.abcApaarId ?? "",
      admissionState: l.admissionState,
      addressLine1: l.addressLine1,
      addressLine2: l.addressLine2 ?? "",
      city: l.city ?? "",
      district: l.district ?? "",
      state: l.state ?? "",
      country: l.country ?? "India",
      pincode: l.pincode ?? "",
      correspondenceAddress: l.correspondenceAddress ?? "",
      sslcSchool: l.sslcSchool ?? "",
      sslcBoard: l.sslcBoard ?? "",
      sslcYear: l.sslcYear != null ? String(l.sslcYear) : "",
      sslcResultType: l.sslcResultType ?? "",
      sslcPercent: l.sslcPercent,
      qualificationType: l.qualificationType ?? "",
      qualInstitution: l.qualInstitution ?? "",
      qualBoardUniversity: l.qualBoardUniversity ?? "",
      qualYear: l.qualYear != null ? String(l.qualYear) : "",
      qualResultType: l.qualResultType ?? "",
      qualScore: l.qualScore,
    });
    photoUploadRef.current?.clear();
  }, [isEdit, props.initialLead]);

  function borderFor(key: string) {
    return fieldErrors[key] ? "border-red-500" : "border-[var(--border)]";
  }

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        universityId: props.universityId,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (q) qs.set("q", q);
      if (sort && sort !== "latest") qs.set("sort", sort);
      const res = await fetch(`/api/consultant/leads?${qs.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        leads?: LeadRow[];
        total?: number;
        totalPages?: number;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not load leads");
        return;
      }
      setRows(data.leads ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [props.universityId, page, pageSize, q, sort]);

  React.useEffect(() => {
    if (props.layoutMode === "addOnly" || props.layoutMode === "edit") return;
    void load();
  }, [props.layoutMode, load]);

  React.useEffect(() => {
    setStreamId((prev) => (activeStreams.some((s) => s.id === prev) ? prev : ""));
    setAdmissionDegreeType((prev) => {
      if (!prev) return prev;
      const stillValid = activeStreams.some((s) => s.degreeType?.trim() === prev);
      return stillValid ? prev : "";
    });
  }, [activeStreams]);

  React.useEffect(() => {
    const first = academicYears[0]?.id ?? "";
    setAcademicYearId((prev) => (academicYears.some((y) => y.id === prev) ? prev : first));
  }, [academicYears]);

  React.useEffect(() => {
    if (!setActive || !activeUniversityId) return;
    void fetch("/api/auth/active-university", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ universityId: activeUniversityId }),
    });
  }, [setActive, activeUniversityId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clientErr = validateLeadForm({
      form: studentForm,
      priorDegree,
      hasEntranceExams,
      entranceExams,
      streamId,
      academicYearId,
      programType,
      admissionDegreeType,
      refEmail,
      refPhone,
      academicYearsCount: academicYears.length,
      streamsCount: activeStreams.length,
    });
    if (Object.keys(clientErr).length > 0) {
      setFieldErrors(clientErr);
      return;
    }
    setFieldErrors({});

    const photoFile = photoUploadRef.current?.getFile() ?? null;
    const removePhoto = photoUploadRef.current?.isPhotoRemoved() ?? false;

    const f = studentForm;
    const payload = {
      universityId: activeUniversityId,
      academicYearId: academicYearId || undefined,
      streamId,
      programType,
      admissionDegreeType,
      studentTitle: f.studentTitle || null,
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      email: f.email.trim(),
      mobile: f.mobile.trim(),
      gender: f.gender,
      dateOfBirth: f.dateOfBirth,
      category: f.category || null,
      caste: f.caste.trim() || null,
      religion: f.religion.trim() || null,
      nationality: f.nationality.trim(),
      guardianName: f.guardianName.trim(),
      guardianMobile: f.guardianMobile.trim(),
      uidaiNumber: f.uidaiNumber.trim() || null,
      abcApaarId: f.abcApaarId.trim() || null,
      admissionState: f.admissionState,
      addressLine1: f.addressLine1.trim(),
      addressLine2: f.addressLine2.trim() || null,
      city: f.city.trim(),
      district: f.district.trim(),
      state: f.state,
      country: f.country.trim(),
      pincode: f.pincode.trim(),
      correspondenceAddress: f.correspondenceAddress.trim(),
      sslcSchool: f.sslcSchool.trim(),
      sslcBoard: f.sslcBoard,
      sslcYear: f.sslcYear.trim(),
      sslcResultType: f.sslcResultType,
      sslcPercent: f.sslcPercent.trim(),
      qualificationType: f.qualificationType,
      qualInstitution: f.qualInstitution.trim(),
      qualBoardUniversity: f.qualBoardUniversity.trim(),
      qualYear: f.qualYear.trim(),
      qualResultType: f.qualResultType,
      qualScore: f.qualScore.trim(),
      priorDegreeType: priorDegree.priorDegreeType.trim() || null,
      priorDegreeName: priorDegree.priorDegreeName.trim() || null,
      priorDegreeStream: priorDegree.priorDegreeStream.trim() || null,
      priorDegreeCollege: priorDegree.priorDegreeCollege.trim() || null,
      priorDegreeUniversity: priorDegree.priorDegreeUniversity.trim() || null,
      priorDegreeYear: priorDegree.priorDegreeYear.trim() || null,
      priorDegreeResultType: priorDegree.priorDegreeResultType || null,
      priorDegreeScore: priorDegree.priorDegreeScore.trim() || null,
      hasEntranceExams,
      entranceExams: hasEntranceExams
        ? entranceExams.map((exam) => ({
            examName: exam.examName.trim(),
            centreName: exam.centreName.trim(),
            registrationNumber: exam.registrationNumber.trim() || null,
            scoreRank: exam.scoreRank.trim(),
            examYear: exam.examYear.trim(),
          }))
        : [],
      referralFirstName: refFn.trim() || null,
      referralLastName: refLn.trim() || null,
      referralPhone: refPhone.trim() || null,
      referralEmail: refEmail.trim() || null,
      ...(isEdit && removePhoto && !photoFile ? { removePhoto: true } : {}),
    };

    let body: BodyInit;
    const useMultipart =
      useExtendedFields &&
      (Boolean(photoFile) || Boolean(sslcMarksCardFile) || Boolean(qualMarksCardFile));
    if (useMultipart) {
      const form = new FormData();
      form.set("payload", JSON.stringify(payload));
      if (photoFile) form.set("photoFile", photoFile);
      if (sslcMarksCardFile) form.set("sslcMarksCardFile", sslcMarksCardFile);
      if (qualMarksCardFile) form.set("qualMarksCardFile", qualMarksCardFile);
      body = form;
    } else {
      body = JSON.stringify(payload);
    }

    const url = isEdit && props.leadId ? `/api/consultant/leads/${props.leadId}` : "/api/consultant/leads";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: useMultipart ? undefined : { "Content-Type": "application/json" },
      body,
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      fieldErrors?: unknown;
    };
    if (!res.ok) {
      const apiFe = mapApiFieldErrors(data.fieldErrors);
      if (Object.keys(apiFe).length > 0) setFieldErrors(apiFe);
      setError(data.error ?? (isEdit ? "Could not update student" : "Could not create student"));
      return;
    }
    if (isEdit) {
      router.push("/dashboard/consultant/leads");
      return;
    }
    setStudentForm(createEmptyStudentFormValues());
    setPriorDegree(createEmptyPriorDegreeValues());
    setHasEntranceExams(false);
    setEntranceExams([]);
    setRefFn("");
    setRefLn("");
    setRefPhone("");
    setRefEmail("");
    photoUploadRef.current?.clear();
    setSslcMarksCardFile(null);
    setQualMarksCardFile(null);
    setExistingPhotoUrl(null);
    setExistingSslcMarksCardUrl(null);
    setExistingQualMarksCardUrl(null);
    setProgramType("");
    setAdmissionDegreeType("");
    setStreamId("");
    setFieldErrors({});
    setAcademicYearId(academicYears[0]?.id ?? "");
    if (isAddOnly) {
      router.push("/dashboard/consultant/leads");
      return;
    }
    await load();
  }

  async function onDeleteLead() {
    if (!isEdit || !props.leadId) return;
    if (!window.confirm("Delete this lead? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/consultant/leads/${props.leadId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not delete lead");
        return;
      }
      router.push("/dashboard/consultant/leads");
    } finally {
      setDeleting(false);
    }
  }

  const showAssignedPartnerCol = rows.some((r) =>
    Object.prototype.hasOwnProperty.call(r, "assignedPartnerDisplayName"),
  );

  function referralSummary(r: LeadRow): string {
    const parts = [r.referralFirstName, r.referralLastName].filter(Boolean);
    if (parts.length === 0 && !r.referralPhone && !r.referralEmail) return "—";
    return [parts.join(" "), r.referralPhone, r.referralEmail].filter(Boolean).join(" · ");
  }

  const isHub = props.layoutMode === "hub";

  const admissionUniversities = hasUniversityPicker
    ? universityOptions.map(({ id, name, code }) => ({ id, name, code }))
    : [{ id: activeUniversity.id, name: activeUniversity.name, code: activeUniversity.code }];

  const canSubmitLead =
    activeStreams.length > 0 &&
    Boolean(streamId) &&
    Boolean(programType) &&
    Boolean(admissionDegreeType) &&
    academicYears.length > 0 &&
    Boolean(academicYearId);

  const addLeadForm = (
    <form onSubmit={onCreate} className="mt-4 space-y-6" noValidate>
      {useExtendedFields ? (
        <>
          <ConsultantAdmissionDetailsSection
            universities={admissionUniversities}
            selectedUniversityId={activeUniversityId}
            onUniversityChange={(id) => {
              setSelectedUniversityId(id);
              setProgramType("");
              setAdmissionDegreeType("");
              setStreamId("");
            }}
            showUniversityPicker={hasUniversityPicker}
            academicYears={academicYears}
            academicYearId={academicYearId}
            onAcademicYearChange={setAcademicYearId}
            streams={activeStreams.map((s) => ({
              id: s.id,
              name: s.name,
              programLevel: s.programLevel ?? null,
              degreeType: s.degreeType ?? null,
            }))}
            programType={programType}
            onProgramTypeChange={setProgramType}
            admissionDegreeType={admissionDegreeType}
            onAdmissionDegreeTypeChange={setAdmissionDegreeType}
            streamId={streamId}
            onStreamIdChange={setStreamId}
            fieldErrors={fieldErrors}
            borderFor={borderFor}
            clearError={clearStudentFieldError}
          />
          <ConsultantStudentFormFields
            values={studentForm}
            onChange={updateStudentForm}
            fieldErrors={fieldErrors}
            borderFor={borderFor}
            clearError={clearStudentFieldError}
            isEdit={isEdit}
            photoUploadRef={photoUploadRef}
            existingPhotoUrl={existingPhotoUrl}
            sslcMarksCardFile={sslcMarksCardFile}
            existingSslcMarksCardUrl={existingSslcMarksCardUrl}
            onSslcMarksCardChange={setSslcMarksCardFile}
            qualMarksCardFile={qualMarksCardFile}
            existingQualMarksCardUrl={existingQualMarksCardUrl}
            onQualMarksCardChange={setQualMarksCardFile}
          />
          <ConsultantOtherEducationSection
            values={priorDegree}
            onChange={updatePriorDegree}
            fieldErrors={fieldErrors}
            borderFor={borderFor}
            clearError={clearStudentFieldError}
          />
          <ConsultantEntranceExamsSection
            hasEntranceExams={hasEntranceExams}
            onHasEntranceExamsChange={setHasEntranceExams}
            exams={entranceExams}
            onExamsChange={setEntranceExams}
            fieldErrors={fieldErrors}
            borderFor={borderFor}
            clearError={clearStudentFieldError}
          />
        </>
      ) : null}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Referral (optional)</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">First name</label>
            <input
              value={refFn}
              onChange={(e) => setRefFn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Last name</label>
            <input
              value={refLn}
              onChange={(e) => setRefLn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Contact</label>
            <input
              value={refPhone}
              onChange={(e) => {
                setRefPhone(e.target.value);
                setFieldErrors((f) => {
                  const n = { ...f };
                  delete n.referralPhone;
                  return n;
                });
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("referralPhone")}`}
              aria-invalid={Boolean(fieldErrors.referralPhone)}
            />
            {fieldErrors.referralPhone ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.referralPhone}</p>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={refEmail}
              onChange={(e) => {
                setRefEmail(e.target.value);
                setFieldErrors((f) => {
                  const n = { ...f };
                  delete n.referralEmail;
                  return n;
                });
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("referralEmail")}`}
              aria-invalid={Boolean(fieldErrors.referralEmail)}
            />
            {fieldErrors.referralEmail ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.referralEmail}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmitLead || deleting}
          className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isEdit ? "Save changes" : "Add student"}
        </button>
        {isEdit ? (
          <button
            type="button"
            disabled={deleting}
            onClick={() => void onDeleteLead()}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {deleting ? "Deleting…" : "Delete lead"}
          </button>
        ) : null}
      </div>
    </form>
  );

  return (
    <div
      className={
        isHub ? "" : "mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      }
    >
      {isAddOnly || isEdit ? (
        <>
          <nav className="text-sm text-[var(--foreground-muted)]">
            <Link href="/dashboard/consultant/leads" className="text-[var(--primary)] underline-offset-2 hover:underline">
              Student leads
            </Link>
            <span className="mx-1.5">/</span>
            <span className="font-medium text-[var(--foreground)]">{isEdit ? "Edit student" : "Add student"}</span>
          </nav>
          <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">{isEdit ? "Edit student" : "Add student"}</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            {hasUniversityPicker
              ? isEdit
                ? "Update student details below."
                : "Select a university and enter student details below."
              : `${activeUniversity.name} (${activeUniversity.code})`}
          </p>
        </>
      ) : isHub ? (
        <>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Partner leads</h2>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            {props.universityName} ({props.universityCode})
          </p>
          <p className="mt-6 text-sm text-[var(--foreground-muted)]">
            Click a <strong className="text-[var(--foreground)]">university card</strong> above to filter this list. Use{" "}
            <strong className="text-[var(--foreground)]">+ Lead</strong> on a card to add a prospect.
          </p>
        </>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {isAddOnly || isEdit ? (
        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="text-sm text-[var(--foreground-muted)]">
            Admission partner name is recorded automatically from your account.
          </p>
          {addLeadForm}
        </section>
      ) : null}

      {showBulk ? (
        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <ConsultantBulkCsvPanel
            universityName={props.universityName}
            universityCode={props.universityCode}
            streams={props.streams}
            onSuccess={() => void load()}
          />
        </section>
      ) : null}

      {!isAddOnly && !isEdit ? (
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Your leads</h2>
        <ListQueryToolbar
          className="mt-4"
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          q={q}
          sort={sort}
          sortOptions={SORT_LEADS}
          searchPlaceholder="Name, email, or mobile"
          loading={loading}
          itemLabel="lead"
        />
        {loading ? (
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">Loading…</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                <tr>
                  <th className="px-3 py-2">First</th>
                  <th className="px-3 py-2">Last</th>
                  <th className="px-3 py-2">Mobile</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">Referral</th>
                  <th className="px-3 py-2">Branch</th>
                  <th className="px-3 py-2">University</th>
                  <th className="px-3 py-2">Degree Type</th>
                  <th className="px-3 py-2">Created</th>
                  {showAssignedPartnerCol ? <th className="px-3 py-2">Assigned partner</th> : null}
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={showAssignedPartnerCol ? 11 : 10} className="px-3 py-8 text-center text-[var(--foreground-muted)]">
                      No leads match your search.
                    </td>
                  </tr>
                ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-2">{r.firstName}</td>
                    <td className="px-3 py-2">{r.lastName}</td>
                    <td className="px-3 py-2">{r.mobile}</td>
                    <td className="px-3 py-2">{r.email}</td>
                    <td className="px-3 py-2">{r.admissionState ?? "—"}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2 text-xs" title={referralSummary(r)}>
                      {referralSummary(r)}
                    </td>
                    <td className="px-3 py-2">{r.branchName ?? "—"}</td>
                    <td className="px-3 py-2">{r.university.name}</td>
                    <td className="px-3 py-2">{r.stream.name}</td>
                    <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    {showAssignedPartnerCol ? (
                      <td className="max-w-[10rem] truncate px-3 py-2 text-xs" title={r.assignedPartnerDisplayName ?? ""}>
                        {r.assignedPartnerDisplayName ?? "—"}
                      </td>
                    ) : null}
                    <td className="px-3 py-2">{r.pipelineStatus}</td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      ) : null}
    </div>
  );
}
