"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ConsultantBulkCsvPanel } from "@/components/consultant-bulk-csv-panel";
import { ListQueryToolbar, SORT_LEADS } from "@/components/list-controls";
import { INDIAN_STATES_AND_UT } from "@/lib/indian-states";
import type { SerializedConsultantLeadDetail } from "@/lib/consultant-lead-payload";

type Stream = { id: string; name: string };
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

type Props = {
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
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  streamId: string;
  academicYearId: string;
  admissionState: string;
  nationality: string;
  address: string;
  hasPhoto: boolean;
  refEmail: string;
  refPhone: string;
  academicYearsCount: number;
  streamsCount: number;
  extendedFields: boolean;
}): Record<string, string> {
  const e: Record<string, string> = {};
  if (!input.firstName.trim()) e.firstName = "First name is required";
  if (!input.lastName.trim()) e.lastName = "Last name is required";
  const em = input.email.trim();
  if (!em) e.email = "Email is required";
  else if (!looksLikeEmail(em)) e.email = "Enter a valid email address";
  const mob = input.mobile.trim();
  const digits = mob.replace(/\D/g, "");
  if (!mob) e.mobile = "Mobile is required";
  else if (digits.length < 10 || digits.length > 15) e.mobile = "Enter a valid mobile number (10–15 digits)";
  if (input.streamsCount === 0 || !input.streamId) e.streamId = "Select a degree type";
  if (input.academicYearsCount === 0) {
    e.academicYearId = "No academic year is configured for this university";
  } else if (!input.academicYearId) {
    e.academicYearId = "Select an academic year";
  }
  if (!input.admissionState) e.admissionState = "Select state";
  const nat = input.nationality.trim();
  if (!nat) e.nationality = "Nationality is required";

  if (input.extendedFields) {
    if (!input.address.trim()) e.address = "Address is required";
    if (!input.hasPhoto) e.photoFile = "Photo is required (JPG, JPEG, or PNG, max 2 MB)";
  }

  const rE = input.refEmail.trim();
  if (rE && !looksLikeEmail(rE)) e.referralEmail = "Enter a valid email address";
  const rP = input.refPhone.trim();
  if (rP && rP.replace(/\D/g, "").length < 10) e.referralPhone = "Enter at least 10 digits for contact";

  return e;
}

export function ConsultantLeadsClient(props: Props) {
  const showBulk = props.showBulkUpload ?? false;
  const setActive = props.setActiveUniversityOnMount ?? false;
  const universityOptions = props.universityOptions ?? [];
  const isEdit = props.layoutMode === "edit";
  const isAddOnly = props.layoutMode === "addOnly";
  const useExtendedFields = isAddOnly || isEdit;
  const hasUniversityPicker = (isAddOnly || isEdit) && universityOptions.length > 0;

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

  const [fn, setFn] = React.useState("");
  const [ln, setLn] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [nat, setNat] = React.useState("India");
  const [streamId, setStreamId] = React.useState(props.streams[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = React.useState(props.academicYears?.[0]?.id ?? "");
  const [admissionState, setAdmissionState] = React.useState("");
  const [refFn, setRefFn] = React.useState("");
  const [refLn, setRefLn] = React.useState("");
  const [refPhone, setRefPhone] = React.useState("");
  const [refEmail, setRefEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = React.useState<string | null>(
    props.initialLead?.photoUrl ?? null,
  );
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(props.initialLead?.photoUrl ?? null);
  const [pucBoard, setPucBoard] = React.useState("");
  const [pucYear, setPucYear] = React.useState("");
  const [pucPercent, setPucPercent] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [degreePercent, setDegreePercent] = React.useState("");
  const [degreeCollege, setDegreeCollege] = React.useState("");
  const [degreeName, setDegreeName] = React.useState("");
  const [ieltsScore, setIeltsScore] = React.useState("");
  const [toeflScore, setToeflScore] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (photoFile) {
      const url = URL.createObjectURL(photoFile);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPhotoPreview(existingPhotoUrl);
  }, [photoFile, existingPhotoUrl]);

  React.useEffect(() => {
    if (!isEdit || !props.initialLead) return;
    const l = props.initialLead;
    setSelectedUniversityId(l.universityId);
    setFn(l.firstName);
    setLn(l.lastName);
    setEmail(l.email);
    setMobile(l.mobile);
    setNat(l.nationality ?? "India");
    setStreamId(l.streamId);
    setAcademicYearId(l.academicYearId);
    setAdmissionState(l.admissionState);
    setRefFn(l.referralFirstName ?? "");
    setRefLn(l.referralLastName ?? "");
    setRefPhone(l.referralPhone ?? "");
    setRefEmail(l.referralEmail ?? "");
    setAddress(l.address);
    setExistingPhotoUrl(l.photoUrl);
    setPucBoard(l.pucBoard ?? "");
    setPucYear(l.pucYear != null ? String(l.pucYear) : "");
    setPucPercent(l.pucPercent);
    setGender(l.gender ?? "");
    setDateOfBirth(l.dateOfBirth);
    setPincode(l.pincode ?? "");
    setDegreePercent(l.degreePercent);
    setDegreeCollege(l.degreeCollege ?? "");
    setDegreeName(l.degreeName ?? "");
    setIeltsScore(l.ieltsScore ?? "");
    setToeflScore(l.toeflScore ?? "");
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
    const first = activeStreams[0]?.id ?? "";
    setStreamId((prev) => (activeStreams.some((s) => s.id === prev) ? prev : first));
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
      firstName: fn,
      lastName: ln,
      email,
      mobile,
      streamId,
      academicYearId,
      admissionState,
      nationality: nat,
      address,
      hasPhoto: Boolean(photoFile) || Boolean(existingPhotoUrl),
      refEmail,
      refPhone,
      academicYearsCount: academicYears.length,
      streamsCount: activeStreams.length,
      extendedFields: useExtendedFields,
    });
    if (Object.keys(clientErr).length > 0) {
      setFieldErrors(clientErr);
      return;
    }
    setFieldErrors({});

    const payload = {
      universityId: activeUniversityId,
      academicYearId: academicYearId || undefined,
      firstName: fn.trim(),
      lastName: ln.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      nationality: nat.trim() || null,
      streamId,
      admissionState,
      address: address.trim(),
      gender: gender || null,
      dateOfBirth: dateOfBirth || null,
      pincode: pincode.trim() || null,
      pucBoard: pucBoard.trim() || null,
      pucYear: pucYear.trim() || null,
      pucPercent: pucPercent.trim() || null,
      degreePercent: degreePercent.trim() || null,
      degreeCollege: degreeCollege.trim() || null,
      degreeName: degreeName.trim() || null,
      ieltsScore: ieltsScore.trim() || null,
      toeflScore: toeflScore.trim() || null,
      referralFirstName: refFn.trim() || null,
      referralLastName: refLn.trim() || null,
      referralPhone: refPhone.trim() || null,
      referralEmail: refEmail.trim() || null,
    };

    let body: BodyInit;
    const useMultipart = useExtendedFields && Boolean(photoFile);
    if (useMultipart && photoFile) {
      const form = new FormData();
      form.set("payload", JSON.stringify(payload));
      form.set("photoFile", photoFile);
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
      setError(data.error ?? (isEdit ? "Could not update lead" : "Could not create lead"));
      return;
    }
    if (isEdit) {
      router.push("/dashboard/consultant/leads");
      return;
    }
    setFn("");
    setLn("");
    setEmail("");
    setMobile("");
    setNat("India");
    setAdmissionState("");
    setRefFn("");
    setRefLn("");
    setRefPhone("");
    setRefEmail("");
    setAddress("");
    setPhotoFile(null);
    setExistingPhotoUrl(null);
    setPucBoard("");
    setPucYear("");
    setPucPercent("");
    setGender("");
    setDateOfBirth("");
    setPincode("");
    setDegreePercent("");
    setDegreeCollege("");
    setDegreeName("");
    setIeltsScore("");
    setToeflScore("");
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

  const canSubmitLead =
    activeStreams.length > 0 &&
    Boolean(streamId) &&
    academicYears.length > 0 &&
    Boolean(academicYearId) &&
    (!useExtendedFields || (address.trim().length > 0 && (Boolean(photoFile) || Boolean(existingPhotoUrl))));

  const addLeadForm = (
    <form onSubmit={onCreate} className="mt-4 space-y-6" noValidate>
      {hasUniversityPicker ? (
        <div>
          <label className="text-sm font-medium">University</label>
          <select
            value={selectedUniversityId}
            onChange={(e) => {
              setSelectedUniversityId(e.target.value);
              setFieldErrors((f) => {
                const n = { ...f };
                delete n.universityId;
                return n;
              });
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("universityId")}`}
          >
            {universityOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.code})
              </option>
            ))}
          </select>
          {fieldErrors.universityId ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.universityId}</p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">First name</label>
          <input
            value={fn}
            onChange={(e) => {
              setFn(e.target.value);
              setFieldErrors((f) => {
                const n = { ...f };
                delete n.firstName;
                return n;
              });
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("firstName")}`}
            aria-invalid={Boolean(fieldErrors.firstName)}
          />
          {fieldErrors.firstName ? <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium">Last name</label>
          <input
            value={ln}
            onChange={(e) => {
              setLn(e.target.value);
              setFieldErrors((f) => {
                const n = { ...f };
                delete n.lastName;
                return n;
              });
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("lastName")}`}
            aria-invalid={Boolean(fieldErrors.lastName)}
          />
          {fieldErrors.lastName ? <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((f) => {
                const n = { ...f };
                delete n.email;
                return n;
              });
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("email")}`}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium">Mobile</label>
          <input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value);
              setFieldErrors((f) => {
                const n = { ...f };
                delete n.mobile;
                return n;
              });
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("mobile")}`}
            aria-invalid={Boolean(fieldErrors.mobile)}
          />
          {fieldErrors.mobile ? <p className="mt-1 text-xs text-red-600">{fieldErrors.mobile}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium">Degree Type</label>
          <select
            value={streamId}
            onChange={(e) => {
              setStreamId(e.target.value);
              setFieldErrors((f) => {
                const n = { ...f };
                delete n.streamId;
                return n;
              });
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("streamId")}`}
            aria-invalid={Boolean(fieldErrors.streamId)}
          >
            {activeStreams.length === 0 ? <option value="">No programs configured</option> : null}
            {activeStreams.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {fieldErrors.streamId ? <p className="mt-1 text-xs text-red-600">{fieldErrors.streamId}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium">Academic year</label>
          <select
            value={academicYearId}
            onChange={(e) => {
              setAcademicYearId(e.target.value);
              setFieldErrors((f) => {
                const n = { ...f };
                delete n.academicYearId;
                return n;
              });
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("academicYearId")}`}
            aria-invalid={Boolean(fieldErrors.academicYearId)}
          >
            {academicYears.length === 0 ? <option value="">No years configured</option> : null}
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </select>
          {fieldErrors.academicYearId ? <p className="mt-1 text-xs text-red-600">{fieldErrors.academicYearId}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium">State</label>
          <select
            value={admissionState}
            onChange={(e) => {
              setAdmissionState(e.target.value);
              setFieldErrors((f) => {
                const n = { ...f };
                delete n.admissionState;
                return n;
              });
            }}
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("admissionState")}`}
            aria-invalid={Boolean(fieldErrors.admissionState)}
          >
            <option value="" disabled>
              Select state
            </option>
            {INDIAN_STATES_AND_UT.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {fieldErrors.admissionState ? <p className="mt-1 text-xs text-red-600">{fieldErrors.admissionState}</p> : null}
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Nationality</label>
          <input
            value={nat}
            onChange={(e) => {
              setNat(e.target.value);
              setFieldErrors((f) => {
                const n = { ...f };
                delete n.nationality;
                return n;
              });
            }}
            placeholder="India"
            className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("nationality")}`}
            aria-invalid={Boolean(fieldErrors.nationality)}
          />
          {fieldErrors.nationality ? <p className="mt-1 text-xs text-red-600">{fieldErrors.nationality}</p> : null}
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">Defaults to India; change if needed.</p>
        </div>
      </div>

      {useExtendedFields ? (
        <>
          <div>
            <label className="text-sm font-medium">Address *</label>
            <textarea
              value={address}
              rows={3}
              onChange={(e) => {
                setAddress(e.target.value);
                setFieldErrors((f) => {
                  const n = { ...f };
                  delete n.address;
                  return n;
                });
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("address")}`}
            />
            {fieldErrors.address ? <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p> : null}
          </div>

          <div>
            <label className="text-sm font-medium">
              {isEdit ? "Photo (upload to replace)" : "Photo upload *"} (JPG/JPEG/PNG, max 2 MB)
            </label>
            {isEdit && existingPhotoUrl && !photoFile ? (
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">Current photo is on file. Upload only if you want to replace it.</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-start gap-4">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Choose photo
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setPhotoFile(file);
                    setFieldErrors((f) => {
                      const n = { ...f };
                      delete n.photoFile;
                      return n;
                    });
                  }}
                />
              </label>
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-24 w-24 rounded-lg border border-[var(--border)] object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/30 text-xs text-[var(--foreground-muted)]">
                  Preview
                </div>
              )}
            </div>
            {fieldErrors.photoFile ? <p className="mt-1 text-xs text-red-600">{fieldErrors.photoFile}</p> : null}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              PUC details (optional)
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium">PUC board</label>
                <input
                  value={pucBoard}
                  onChange={(e) => setPucBoard(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">PUC year</label>
                <input
                  value={pucYear}
                  onChange={(e) => setPucYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">PUC %</label>
                <input
                  value={pucPercent}
                  onChange={(e) => setPucPercent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              Other (optional)
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">DOB</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Pincode</label>
                <input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Percentage</label>
                <input
                  value={degreePercent}
                  onChange={(e) => setDegreePercent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">College name</label>
                <input
                  value={degreeCollege}
                  onChange={(e) => setDegreeCollege(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Degree completed</label>
                <input
                  value={degreeName}
                  onChange={(e) => setDegreeName(e.target.value)}
                  placeholder="e.g. 12th"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">IELTS</label>
                <input
                  value={ieltsScore}
                  onChange={(e) => setIeltsScore(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">TOEFL</label>
                <input
                  value={toeflScore}
                  onChange={(e) => setToeflScore(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
            </div>
          </div>
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
          {isEdit ? "Save changes" : "Add lead"}
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
            <span className="font-medium text-[var(--foreground)]">{isEdit ? "Edit lead" : "Add lead"}</span>
          </nav>
          <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">{isEdit ? "Edit lead" : "Add lead"}</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            {hasUniversityPicker
              ? isEdit
                ? "Update prospect details below."
                : "Select a university and enter the prospect details below."
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
