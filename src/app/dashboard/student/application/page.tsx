"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  StudentPaymentPanel,
  StepIndicator,
  UniversitySelector,
  cardClass,
  inputClass,
} from "@/components/student/student-portal-ui";
import { formatInr } from "@/lib/student-portal";

type AppListItem = {
  id: string;
  universityName: string;
  programmeName: string;
};

type ApplicationData = {
  id: string;
  referenceCode: string | null;
  university: {
    name: string;
    code: string;
    logoUrl: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    district: string | null;
    pincode: string | null;
  } | null;
  programme: {
    name: string;
    durationYears: number | null;
    intakeMonth: string | null;
    programLevel: string | null;
    academicYear: string | null;
    specialization: string | null;
  } | null;
  feesSnapshot: {
    applicationFee: number;
    tuitionYear1: number | null;
    collegeFee: number | null;
    hostelFrom: number | null;
  };
  lead: {
    admissionStatus: string;
    address: string | null;
    district: string | null;
    state: string | null;
    pincode: string | null;
    sslcBoard: string | null;
    sslcPercent: number | null;
    pucBoard: string | null;
    pucYear: number | null;
    pucPercent: number | null;
    degreeName: string | null;
    degreeStream: string | null;
    degreeCollege: string | null;
    degreeUniversity: string | null;
    degreePercent: number | null;
  } | null;
  user: {
    name: string | null;
    email: string;
    phone: string | null;
    phoneAlternate: string | null;
    whatsappNumber: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    pincode: string | null;
    districtStudent: string | null;
    stateStudent: string | null;
    sslcSchool: string | null;
    sslcBoard: string | null;
    sslcPercent: number | null;
    pucType: string | null;
    pucInstitution: string | null;
    pucYear: number | null;
    pucPercent: number | null;
    degreeName: string | null;
    degreeStream: string | null;
    degreeCollege: string | null;
    degreeUniversity: string | null;
    degreePercent: number | null;
    ieltsScore: string | null;
    toeflScore: string | null;
    passportNumber: string | null;
    passportExpiry: string | null;
  };
  paymentSummary: {
    applicationFee: number;
    paidRupees: number;
    remainingDue: number;
    panelState: "awaiting_approval" | "ready_to_pay" | "payment_done";
  };
  transactions: {
    transactionRef: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
};

function splitName(name: string | null | undefined): [string, string] {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return [parts[0] ?? "", parts.slice(1).join(" ")];
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function StudentApplicationPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [applications, setApplications] = React.useState<AppListItem[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [app, setApp] = React.useState<ApplicationData | null>(null);
  const [razorpayConfigured, setRazorpayConfigured] = React.useState(false);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [altPhone, setAltPhone] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [district, setDistrict] = React.useState("");
  const [state, setState] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [showSslc, setShowSslc] = React.useState(false);
  const [sslcSchool, setSslcSchool] = React.useState("");
  const [sslcBoard, setSslcBoard] = React.useState("");
  const [sslcPercent, setSslcPercent] = React.useState("");
  const [pucType, setPucType] = React.useState("PUC");
  const [pucInstitution, setPucInstitution] = React.useState("");
  const [pucYear, setPucYear] = React.useState("");
  const [pucPercent, setPucPercent] = React.useState("");
  const [degreeName, setDegreeName] = React.useState("");
  const [degreeStream, setDegreeStream] = React.useState("");
  const [degreeCollege, setDegreeCollege] = React.useState("");
  const [degreeUniversity, setDegreeUniversity] = React.useState("");
  const [degreePercent, setDegreePercent] = React.useState("");
  const [ieltsScore, setIeltsScore] = React.useState("");
  const [toeflScore, setToeflScore] = React.useState("");
  const [passportNumber, setPassportNumber] = React.useState("");
  const [passportExpiry, setPassportExpiry] = React.useState("");

  const hydrateForm = React.useCallback((data: ApplicationData) => {
    const [fn, ln] = splitName(data.user.name);
    setFirstName(fn);
    setLastName(ln);
    setPhone(data.user.phone ?? "");
    setAltPhone(data.user.phoneAlternate ?? "");
    setWhatsapp(data.user.whatsappNumber ?? "");
    setAddress(data.lead?.address ?? "");
    setPincode(data.user.pincode ?? data.lead?.pincode ?? "");
    setDistrict(data.user.districtStudent ?? data.lead?.district ?? "");
    setState(data.user.stateStudent ?? data.lead?.state ?? "");
    setGender(data.user.gender ?? "");
    setDateOfBirth(isoToDateInput(data.user.dateOfBirth));
    const hasSslc =
      Boolean(data.user.sslcSchool || data.user.sslcBoard || data.lead?.sslcBoard) ||
      data.user.sslcPercent != null ||
      data.lead?.sslcPercent != null;
    setShowSslc(hasSslc);
    setSslcSchool(data.user.sslcSchool ?? "");
    setSslcBoard(data.user.sslcBoard ?? data.lead?.sslcBoard ?? "");
    setSslcPercent(
      data.user.sslcPercent?.toString() ?? data.lead?.sslcPercent?.toString() ?? "",
    );
    setPucType(data.user.pucType ?? "PUC");
    setPucInstitution(data.user.pucInstitution ?? data.lead?.pucBoard ?? "");
    setPucYear(data.user.pucYear?.toString() ?? data.lead?.pucYear?.toString() ?? "");
    setPucPercent(data.user.pucPercent?.toString() ?? data.lead?.pucPercent?.toString() ?? "");
    setDegreeName(data.user.degreeName ?? data.lead?.degreeName ?? "");
    setDegreeStream(data.user.degreeStream ?? data.lead?.degreeStream ?? "");
    setDegreeCollege(data.user.degreeCollege ?? data.lead?.degreeCollege ?? "");
    setDegreeUniversity(data.user.degreeUniversity ?? data.lead?.degreeUniversity ?? "");
    setDegreePercent(
      data.user.degreePercent?.toString() ?? data.lead?.degreePercent?.toString() ?? "",
    );
    setIeltsScore(data.user.ieltsScore ?? "");
    setToeflScore(data.user.toeflScore ?? "");
    setPassportNumber(data.user.passportNumber ?? "");
    setPassportExpiry(isoToDateInput(data.user.passportExpiry));
  }, []);

  async function loadApp(appId?: string, options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const qs = appId ? `?applicationId=${encodeURIComponent(appId)}` : "";
      const res = await fetch(`/api/student/application${qs}`);
      const data = (await res.json().catch(() => ({}))) as {
        applications?: AppListItem[];
        application?: ApplicationData | null;
        razorpayConfigured?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not load application");
        return;
      }
      setApplications(data.applications ?? []);
      setRazorpayConfigured(Boolean(data.razorpayConfigured));
      const nextApp = data.application ?? null;
      setApp(nextApp);
      if (nextApp) {
        setSelectedId(nextApp.id);
        hydrateForm(nextApp);
      }
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadApp();
  }, []);

  async function saveStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!app) return;
    setError(null);

    const body: Record<string, unknown> = {
      applicationId: app.id,
      firstName,
      lastName,
      phone,
      phoneAlternate: altPhone.trim() || null,
      whatsappNumber: whatsapp.trim() || null,
      address: address.trim() || null,
      pincode: pincode.trim() || null,
      district: district.trim() || null,
      state: state.trim() || null,
      gender: gender || null,
      dateOfBirth: dateOfBirth || null,
      pucType,
      pucInstitution: pucInstitution.trim() || null,
      pucYear: pucYear ? Number(pucYear) : null,
      pucPercent: pucPercent ? Number(pucPercent) : null,
      ieltsScore: ieltsScore.trim() || null,
      toeflScore: toeflScore.trim() || null,
      passportNumber: passportNumber.trim() || null,
      passportExpiry: passportExpiry || null,
    };

    if (showSslc) {
      body.sslcSchool = sslcSchool.trim() || null;
      body.sslcBoard = sslcBoard.trim() || null;
      body.sslcPercent = sslcPercent ? Number(sslcPercent) : null;
    }

    if (app.programme?.programLevel === "PG") {
      body.degreeName = degreeName.trim() || null;
      body.degreeStream = degreeStream.trim() || null;
      body.degreeCollege = degreeCollege.trim() || null;
      body.degreeUniversity = degreeUniversity.trim() || null;
      body.degreePercent = degreePercent ? Number(degreePercent) : null;
    }

    const res = await fetch("/api/student/application", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not save");
      return;
    }
    await loadApp(app.id, { silent: true });
    setStep(3);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm text-[var(--foreground-muted)]">Loading…</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">My Application</h1>
        <p className="mt-4 text-sm text-[var(--foreground-muted)]">
          No application is linked to your account yet. Your consultant will convert a lead or invite you when ready.
        </p>
      </div>
    );
  }

  const uni = app.university;
  const prog = app.programme;
  const fees = app.feesSnapshot;
  const campusLine = [uni?.address, uni?.city, uni?.district, uni?.state, uni?.pincode]
    .filter(Boolean)
    .join(", ");
  const isPg = prog?.programLevel === "PG";
  const consultantFilledSslc = Boolean(app.lead?.sslcBoard && app.lead.sslcPercent != null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">My Application</h1>
      <div className="mt-4">
        <UniversitySelector
          applications={applications}
          selectedId={selectedId}
          onChange={(id) => {
            setSelectedId(id);
            void loadApp(id);
            setStep(1);
          }}
        />
      </div>

      <StepIndicator step={step} />
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {step === 1 ? (
        <div className={cardClass}>
          <div className="flex gap-4">
            {uni?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={uni.logoUrl} alt="" className="h-14 w-14 rounded-lg object-contain" />
            ) : null}
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{uni?.name ?? "—"}</h2>
              <p className="text-sm text-[var(--foreground-muted)]">{uni?.code}</p>
            </div>
          </div>

          {campusLine ? (
            <p className="text-sm text-[var(--foreground-muted)]">{campusLine}</p>
          ) : null}

          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              Programme
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--foreground-muted)]">Program</p>
                <p className="text-sm font-medium">{prog?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--foreground-muted)]">Duration</p>
                <p className="text-sm font-medium">
                  {prog?.durationYears != null ? `${prog.durationYears} year(s)` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--foreground-muted)]">Academic year</p>
                <p className="text-sm font-medium">{prog?.academicYear ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--foreground-muted)]">Intake</p>
                <p className="text-sm font-medium">{prog?.intakeMonth ?? "—"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              Fee snapshot
            </p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-[var(--foreground-muted)]">Application fee</dt>
                <dd className="font-medium">{formatInr(fees.applicationFee)}</dd>
              </div>
              <div>
                <dt className="text-[var(--foreground-muted)]">Tuition (Year 1)</dt>
                <dd className="font-medium">{formatInr(fees.tuitionYear1)}</dd>
              </div>
              <div>
                <dt className="text-[var(--foreground-muted)]">College fee</dt>
                <dd className="font-medium">{formatInr(fees.collegeFee)}</dd>
              </div>
              <div>
                <dt className="text-[var(--foreground-muted)]">Hostel from</dt>
                <dd className="font-medium">{formatInr(fees.hostelFrom)}</dd>
              </div>
            </dl>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white"
          >
            Continue to personal details
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <form onSubmit={(e) => void saveStep2(e)} className={cardClass}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Personal details</h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Account email: <span className="font-medium text-[var(--foreground)]">{app.user.email}</span>
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">First name *</label>
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium">Last name *</label>
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium">Mobile *</label>
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium">WhatsApp</label>
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium">Alternate phone</label>
              <input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Date of birth</label>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium">Pincode</label>
              <input value={pincode} onChange={(e) => setPincode(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium">District</label>
              <input value={district} onChange={(e) => setDistrict(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium">State</label>
              <input value={state} onChange={(e) => setState(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-6">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Academic details</h3>

            {consultantFilledSslc ? (
              <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                SSLC details were added by your consultant: {app.lead?.sslcBoard} — {app.lead?.sslcPercent}%
              </p>
            ) : showSslc ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">School name</label>
                  <input value={sslcSchool} onChange={(e) => setSslcSchool(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium">Board</label>
                  <input value={sslcBoard} onChange={(e) => setSslcBoard(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium">SSLC %</label>
                  <input value={sslcPercent} onChange={(e) => setSslcPercent(e.target.value)} className={inputClass} />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSslc(true)}
                className="mt-3 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
              >
                + Add SSLC Details
              </button>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Pre-degree type</label>
                <select value={pucType} onChange={(e) => setPucType(e.target.value)} className={inputClass}>
                  <option value="PUC">PUC</option>
                  <option value="ITI">ITI</option>
                  <option value="Diploma">Diploma</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Institution name</label>
                <input value={pucInstitution} onChange={(e) => setPucInstitution(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium">Year of passing</label>
                <input value={pucYear} onChange={(e) => setPucYear(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium">Pass percentage</label>
                <input value={pucPercent} onChange={(e) => setPucPercent(e.target.value)} className={inputClass} />
              </div>
            </div>

            {isPg ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <p className="sm:col-span-2 text-sm font-medium text-[var(--foreground)]">Degree (PG applicants)</p>
                <div>
                  <label className="text-sm font-medium">Degree name</label>
                  <input value={degreeName} onChange={(e) => setDegreeName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium">Stream / specialisation</label>
                  <input value={degreeStream} onChange={(e) => setDegreeStream(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium">College name</label>
                  <input value={degreeCollege} onChange={(e) => setDegreeCollege(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium">University name</label>
                  <input value={degreeUniversity} onChange={(e) => setDegreeUniversity(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium">Percentage / CGPA</label>
                  <input value={degreePercent} onChange={(e) => setDegreePercent(e.target.value)} className={inputClass} />
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <p className="sm:col-span-2 text-sm font-medium text-[var(--foreground)]">Entrance exams (optional)</p>
              <div>
                <label className="text-sm font-medium">IELTS score</label>
                <input value={ieltsScore} onChange={(e) => setIeltsScore(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium">TOEFL score</label>
                <input value={toeflScore} onChange={(e) => setToeflScore(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium">Passport number</label>
                <input value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium">Passport expiry</label>
                <input type="date" value={passportExpiry} onChange={(e) => setPassportExpiry(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setStep(1)} className="text-sm text-[var(--primary)] underline">
              Back
            </button>
            <button type="submit" className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white">
              Save &amp; continue to payment
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <div className={cardClass}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Payment</h2>
          <StudentPaymentPanel
            applicationId={app.id}
            universityName={uni?.name ?? "University"}
            applicationFee={app.paymentSummary.applicationFee}
            paidRupees={app.paymentSummary.paidRupees}
            remainingDue={app.paymentSummary.remainingDue}
            panelState={app.paymentSummary.panelState}
            leadStatus={app.lead?.admissionStatus ?? null}
            razorpayConfigured={razorpayConfigured}
            transactions={app.transactions}
            onPaid={async () => {
              await loadApp(app.id, { silent: true });
              router.refresh();
            }}
          />
          <button type="button" onClick={() => setStep(2)} className="text-sm text-[var(--primary)] underline">
            Back
          </button>
        </div>
      ) : null}
    </div>
  );
}
