"use client";

import * as React from "react";

type AppData = {
  id: string;
  status: string;
  paymentStatus: string;
  admissionReview: string;
  university: { name: string; code: string } | null;
  lead: {
    stream: { name: string };
    academicYear: { label: string };
    nationality: string | null;
  } | null;
};

export default function StudentApplicationPage() {
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [app, setApp] = React.useState<AppData | null>(null);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [nationality, setNationality] = React.useState("");

  const [payBusy, setPayBusy] = React.useState(false);

  async function loadApp(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/application");
      const data = (await res.json().catch(() => ({}))) as { application?: AppData | null; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not load application");
        return;
      }
      setApp(data.application ?? null);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadApp();
  }, []);

  async function savePersonal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/student/application", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone, nationality: nationality || null }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not save");
      return;
    }
    await loadApp({ silent: true });
    setStep(2);
  }

  async function pay(method: "razorpay" | "upi" | "card", stepKind: "registration" | "program") {
    if (!app) return;
    setPayBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/student/application/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: app.id, method, step: stepKind }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Payment failed");
        return;
      }
      await loadApp({ silent: true });
      if (stepKind === "registration") {
        setStep(2);
      } else {
        setStep(3);
      }
    } finally {
      setPayBusy(false);
    }
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
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Application</h1>
        <p className="mt-4 text-sm text-[var(--foreground-muted)]">
          No application is linked to your account yet. Your consultant will convert a lead or invite you when ready.
        </p>
      </div>
    );
  }

  const course = app.lead?.stream.name ?? "—";
  const year = app.lead?.academicYear.label ?? "—";

  const canPayRegistration =
    app.paymentStatus === "NONE" || app.paymentStatus === "REGISTRATION_PENDING";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Application</h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        {app.university?.name} ({app.university?.code}) · {course} · {year}
      </p>

      <ol className="mt-8 flex gap-4 text-sm">
        <li className={step === 1 ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}>
          1. Personal details
        </li>
        <li className={step === 2 ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}>
          2. Fees
        </li>
        <li className={step === 3 ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}>
          3. Confirmation
        </li>
      </ol>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {step === 1 ? (
        <form onSubmit={savePersonal} className="mt-8 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Personal details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">First name</label>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last name</label>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Mobile</label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Nationality</label>
              <input
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white"
          >
            Continue
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="mt-8 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Registration fee</h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Registration fee: <strong className="text-[var(--foreground)]">₹2,500</strong> · Processing fee included in
            mock total.
          </p>
          <p className="text-xs text-[var(--foreground-muted)]">
            Payment integration: Razorpay / UPI / Card (simulated — no real charge).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={payBusy || !canPayRegistration}
              onClick={() => void pay("razorpay", "registration")}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
            >
              Pay with Razorpay
            </button>
            <button
              type="button"
              disabled={payBusy || !canPayRegistration}
              onClick={() => void pay("upi", "registration")}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
            >
              UPI
            </button>
            <button
              type="button"
              disabled={payBusy || !canPayRegistration}
              onClick={() => void pay("card", "registration")}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
            >
              Card
            </button>
          </div>
          {app.paymentStatus === "REGISTRATION_PAID" || app.paymentStatus === "PROGRAM_PENDING" || app.paymentStatus === "PROGRAM_PAID" ? (
            <div className="mt-6 border-t border-[var(--border)] pt-4">
              <h3 className="font-semibold text-[var(--foreground)]">Program fee</h3>
              <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                Program fee: <strong className="text-[var(--foreground)]">₹50,000</strong> (mock)
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={payBusy || app.paymentStatus === "PROGRAM_PAID"}
                  onClick={() => void pay("razorpay", "program")}
                  className="rounded-lg bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-[var(--background)]"
                >
                  Complete program payment
                </button>
              </div>
            </div>
          ) : null}
          <button type="button" onClick={() => setStep(1)} className="text-sm text-[var(--primary)] underline">
            Back
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-8 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Application submitted</h2>
          <p className="mt-2 text-sm text-[var(--foreground-muted)]">
            Application ID: <code className="text-[var(--foreground)]">{app.id}</code>
          </p>
          <p className="mt-2 text-sm text-[var(--foreground-muted)]">
            Status: {app.status} · Review: {app.admissionReview} · Payment: {app.paymentStatus}
          </p>
        </div>
      ) : null}
    </div>
  );
}
