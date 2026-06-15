"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  StudentPaymentPanel,
  StepIndicator,
  UniversitySelector,
  cardClass,
} from "@/components/student/student-portal-ui";
import { StudentProfileForm } from "@/components/student/student-profile-form";
import { formatInr } from "@/lib/student-portal";
import type { StudentProfilePrefill } from "@/lib/student-lead-prefill";
import { isStudentProfileComplete } from "@/lib/student-lead-prefill";

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
  } | null;
  feesSnapshot: {
    applicationFee: number;
    tuitionYear1: number | null;
    collegeFee: number | null;
    hostelFrom: number | null;
  };
  profile: StudentProfilePrefill;
  profileComplete: boolean;
  lead: { admissionStatus: string } | null;
  user: { email: string };
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

export default function StudentApplicationPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [applications, setApplications] = React.useState<AppListItem[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [app, setApp] = React.useState<ApplicationData | null>(null);
  const [profile, setProfile] = React.useState<StudentProfilePrefill | null>(null);
  const [razorpayConfigured, setRazorpayConfigured] = React.useState(false);
  const [photoUploading, setPhotoUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

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
        setProfile(nextApp.profile);
        if (nextApp.profileComplete && nextApp.paymentSummary.panelState === "ready_to_pay") {
          setStep(3);
        }
      }
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadApp();
  }, []);

  async function uploadPhoto(file: File) {
    if (!app) return;
    setPhotoUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("applicationId", app.id);
      form.set("photoFile", file);
      const res = await fetch("/api/student/application/photo", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { photoUrl?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Photo upload failed");
        return;
      }
      if (data.photoUrl) {
        setProfile((prev) => (prev ? { ...prev, photoUrl: data.photoUrl! } : prev));
        setFieldErrors((f) => {
          const n = { ...f };
          delete n.photoUrl;
          return n;
        });
      }
    } finally {
      setPhotoUploading(false);
    }
  }

  async function saveProfile(submitProfile: boolean) {
    if (!app || !profile) return;
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const body = { applicationId: app.id, submitProfile, ...profile };
    const res = await fetch("/api/student/application", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      fieldErrors?: Record<string, string[] | string>;
    };
    if (!res.ok) {
      const fe: Record<string, string> = {};
      if (data.fieldErrors) {
        for (const [k, v] of Object.entries(data.fieldErrors)) {
          if (Array.isArray(v) && typeof v[0] === "string") fe[k] = v[0];
          else if (typeof v === "string") fe[k] = v;
        }
      }
      if (Object.keys(fe).length > 0) setFieldErrors(fe);
      setError(data.error ?? "Could not save profile");
      setSaving(false);
      return;
    }
    await loadApp(app.id, { silent: true });
    setSaving(false);
    if (submitProfile) setStep(3);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-[var(--foreground-muted)]">Loading…</p>
      </div>
    );
  }

  if (!app || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">My Application</h1>
        <p className="mt-4 text-sm text-[var(--foreground-muted)]">
          No application is linked to your account yet. Your consultant will set your lead to Ready to Pay when you can complete your profile.
        </p>
      </div>
    );
  }

  const uni = app.university;
  const prog = app.programme;
  const fees = app.feesSnapshot;
  const campusLine = [uni?.address, uni?.city, uni?.district, uni?.state, uni?.pincode].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">My Application</h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        Details from your consultant are pre-filled below. Review, update if needed, and submit before payment.
      </p>

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
          {campusLine ? <p className="text-sm text-[var(--foreground-muted)]">{campusLine}</p> : null}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Programme</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs text-[var(--foreground-muted)]">Program</p><p className="text-sm font-medium">{prog?.name ?? "—"}</p></div>
              <div><p className="text-xs text-[var(--foreground-muted)]">Academic year</p><p className="text-sm font-medium">{prog?.academicYear ?? profile.academicYear ?? "—"}</p></div>
              <div><p className="text-xs text-[var(--foreground-muted)]">Program type</p><p className="text-sm font-medium">{profile.programType || "—"}</p></div>
              <div><p className="text-xs text-[var(--foreground-muted)]">Application fee</p><p className="text-sm font-medium">{formatInr(fees.applicationFee)}</p></div>
            </div>
          </div>
          <button type="button" onClick={() => setStep(2)} className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white">
            Review &amp; complete profile
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className={cardClass}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Student profile</h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Verify consultant-entered details. A passport-size photograph and all educational sections are mandatory before continuing to payment.
          </p>
          <div className="mt-6">
            <StudentProfileForm
              profile={profile}
              onChange={(patch) => setProfile((prev) => (prev ? { ...prev, ...patch } : prev))}
              fieldErrors={fieldErrors}
              onPhotoUpload={uploadPhoto}
              photoUploading={photoUploading}
            />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => setStep(1)} className="text-sm text-[var(--primary)] underline">Back</button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveProfile(false)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveProfile(true)}
              className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Submit profile & continue to payment"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className={cardClass}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Payment</h2>
          {!isStudentProfileComplete(profile) ? (
            <p className="mt-2 text-sm text-amber-700">
              Complete and submit your profile (including photograph and educational details) before making payment.
            </p>
          ) : null}
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
          <button type="button" onClick={() => setStep(2)} className="mt-4 text-sm text-[var(--primary)] underline">Back to profile</button>
        </div>
      ) : null}
    </div>
  );
}
