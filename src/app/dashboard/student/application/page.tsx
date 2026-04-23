"use client";

import * as React from "react";

type LeadPayload = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  stream: { name: string };
  academicYear: { label: string };
  nationality: string | null;
  specialization: string | null;
  admissionState: string | null;
  referralFirstName: string | null;
  referralLastName: string | null;
  referralPhone: string | null;
  referralEmail: string | null;
};

type AppData = {
  id: string;
  status: string;
  paymentStatus: string;
  admissionReview: string;
  admissionVisitAt: string | null;
  campusTourAt: string | null;
  razorpayConfigured?: boolean;
  university: { name: string; code: string } | null;
  user: { name: string | null; phone: string | null; email: string };
  lead: LeadPayload | null;
};

function isoToDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay checkout"));
    document.body.appendChild(s);
  });
}

export default function StudentApplicationPage() {
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [app, setApp] = React.useState<AppData | null>(null);
  const [razorpayReady, setRazorpayReady] = React.useState(false);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [nationality, setNationality] = React.useState("");
  const [admissionState, setAdmissionState] = React.useState("");
  const [specialization, setSpecialization] = React.useState("");
  const [refFn, setRefFn] = React.useState("");
  const [refLn, setRefLn] = React.useState("");
  const [refPhone, setRefPhone] = React.useState("");
  const [refEmail, setRefEmail] = React.useState("");

  const [visitAdmission, setVisitAdmission] = React.useState("");
  const [visitTour, setVisitTour] = React.useState("");

  const [payBusy, setPayBusy] = React.useState(false);
  const [customRupees, setCustomRupees] = React.useState("");

  async function loadApp(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/application");
      const data = (await res.json().catch(() => ({}))) as {
        application?: AppData | null;
        razorpayConfigured?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not load application");
        return;
      }
      setApp(data.application ?? null);
      setRazorpayReady(Boolean(data.razorpayConfigured ?? data.application?.razorpayConfigured));
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadApp();
  }, []);

  React.useEffect(() => {
    if (!app?.user) return;
    const name = app.user.name?.trim() ?? "";
    const parts = name.split(/\s+/).filter(Boolean);
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" "));
    setPhone(app.user.phone ?? "");
    const L = app.lead;
    setNationality(L?.nationality ?? "");
    setAdmissionState(L?.admissionState?.trim() ?? "");
    setSpecialization(L?.specialization?.trim() ?? "");
    setRefFn(L?.referralFirstName ?? "");
    setRefLn(L?.referralLastName ?? "");
    setRefPhone(L?.referralPhone ?? "");
    setRefEmail(L?.referralEmail ?? "");
    setVisitAdmission(isoToDatetimeLocalValue(app.admissionVisitAt));
    setVisitTour(isoToDatetimeLocalValue(app.campusTourAt));
  }, [app]);

  async function saveStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!app) return;
    setError(null);
    const body: Record<string, unknown> = {
      firstName,
      lastName,
      phone,
      nationality: nationality || null,
    };
    if (app.lead) {
      body.admissionState = admissionState.trim();
      body.specialization = specialization.trim() || null;
      body.referralFirstName = refFn || null;
      body.referralLastName = refLn || null;
      body.referralPhone = refPhone || null;
      body.referralEmail = refEmail || null;
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
    await loadApp({ silent: true });
    setStep(2);
  }

  async function payMock(method: "razorpay" | "upi" | "card", stepKind: "registration" | "program") {
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
    } finally {
      setPayBusy(false);
    }
  }

  async function startRazorpay(kind: "registration" | "program" | "custom") {
    if (!app) return;
    setPayBusy(true);
    setError(null);
    try {
      let customAmountPaise: number | undefined;
      if (kind === "custom") {
        const rupees = Number(String(customRupees).replace(/,/g, ""));
        if (!Number.isFinite(rupees) || rupees < 1) {
          setError("Enter a custom amount of at least ₹1.");
          return;
        }
        customAmountPaise = Math.round(rupees * 100);
        if (customAmountPaise < 100 || customAmountPaise > 50_000_000) {
          setError("Amount is out of allowed range.");
          return;
        }
      }

      const orderRes = await fetch("/api/student/application/razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.id,
          kind,
          ...(kind === "custom" ? { customAmountPaise } : {}),
        }),
      });
      const orderData = (await orderRes.json().catch(() => ({}))) as {
        error?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
      };
      if (!orderRes.ok) {
        setError(orderData.error ?? "Could not create order");
        return;
      }

      await loadRazorpayScript();
      if (!window.Razorpay || !orderData.orderId || orderData.amount == null || !orderData.currency || !orderData.keyId) {
        setError("Razorpay checkout is unavailable.");
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: app.university?.name ?? "University Portal",
          description:
            kind === "registration"
              ? "Registration fee"
              : kind === "program"
                ? "Program fee"
                : "Custom payment",
          order_id: orderData.orderId,
          handler: async (response: Record<string, string>) => {
            try {
              const verifyRes = await fetch("/api/student/application/razorpay-verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  applicationId: app.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  kind,
                }),
              });
              const verifyJson = (await verifyRes.json().catch(() => ({}))) as { error?: string };
              if (!verifyRes.ok) {
                setError(verifyJson.error ?? "Payment verification failed");
                return;
              }
              await loadApp({ silent: true });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Payment error");
            } finally {
              resolve();
            }
          },
          modal: {
            ondismiss: () => resolve(),
          },
        });
        rzp.open();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment error");
    } finally {
      setPayBusy(false);
    }
  }

  async function saveVisits(e: React.FormEvent) {
    e.preventDefault();
    if (!app) return;
    setError(null);
    if (!visitAdmission.trim() || !visitTour.trim()) {
      setError("Please choose both an admission visit slot and a campus tour slot.");
      return;
    }
    const res = await fetch("/api/student/application", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        admissionVisitAt: visitAdmission,
        campusTourAt: visitTour,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not save visits");
      return;
    }
    await loadApp({ silent: true });
    setStep(4);
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

  const L = app.lead;
  const course = L?.stream.name ?? "—";
  const year = L?.academicYear.label ?? "—";
  const leadEmail = L?.email ?? app.user.email;

  const canPayRegistration =
    app.paymentStatus === "NONE" || app.paymentStatus === "REGISTRATION_PENDING";
  const registrationPaid =
    app.paymentStatus === "REGISTRATION_PAID" ||
    app.paymentStatus === "PROGRAM_PENDING" ||
    app.paymentStatus === "PROGRAM_PAID";
  const programPaid = app.paymentStatus === "PROGRAM_PAID";
  const showProgramFeeBlock = registrationPaid && !programPaid;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Application</h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        {app.university?.name} ({app.university?.code})
      </p>

      <ol className="mt-8 flex flex-wrap gap-3 text-sm">
        <li className={step === 1 ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}>
          1. Application details
        </li>
        <li className={step === 2 ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}>
          2. Fees (Razorpay)
        </li>
        <li className={step === 3 ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}>
          3. Visit schedule
        </li>
        <li className={step === 4 ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}>
          4. Confirmation
        </li>
      </ol>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {step === 1 ? (
        <form onSubmit={(e) => void saveStep1(e)} className="mt-8 space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Application details</h2>
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">
              Review the programme information from your admission record (same fields your admission partner entered).
              Update anything that needs correction before you continue.
            </p>
          </div>

          {L ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Programme</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Stream</p>
                  <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{course}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                    Academic year
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{year}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Specialization</label>
                  <input
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    placeholder="As recorded on your lead"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Looking for admission in which state / region *</label>
                  <input
                    required
                    value={admissionState}
                    onChange={(e) => setAdmissionState(e.target.value)}
                    placeholder="e.g. Karnataka"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-2 text-sm text-[var(--foreground-muted)]">
              No admission lead is linked — update your personal details below. Contact support if programme fields
              should appear here.
            </p>
          )}

          {L ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Referral (optional)</p>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                If someone referred you, their details can be updated here.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Referral first name</label>
                  <input
                    value={refFn}
                    onChange={(e) => setRefFn(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Referral last name</label>
                  <input
                    value={refLn}
                    onChange={(e) => setRefLn(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Referral phone</label>
                  <input
                    value={refPhone}
                    onChange={(e) => setRefPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Referral email</label>
                  <input
                    type="email"
                    value={refEmail}
                    onChange={(e) => setRefEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Your details</p>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              Account email (sign-in): <span className="font-medium text-[var(--foreground)]">{leadEmail}</span>
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">First name *</label>
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last name *</label>
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mobile on record *</label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nationality</label>
                <input
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white"
          >
            Continue to fees
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="mt-8 space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Fees</h2>
          {razorpayReady ? (
            <p className="text-sm text-[var(--foreground-muted)]">
              Pay securely with Razorpay. You can use the standard registration fee, program fee, or a custom amount
              (processed as your registration payment).
            </p>
          ) : (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-[var(--foreground)]">
              Razorpay keys are not configured — using simulated payments for development. Set{" "}
              <code className="rounded bg-[var(--muted)] px-1">RAZORPAY_KEY_ID</code> and{" "}
              <code className="rounded bg-[var(--muted)] px-1">RAZORPAY_KEY_SECRET</code> for live checkout.
            </p>
          )}

          <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Registration</h3>
            <p className="text-sm text-[var(--foreground-muted)]">
              Standard registration fee: <strong className="text-[var(--foreground)]">₹2,500</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              {razorpayReady ? (
                <button
                  type="button"
                  disabled={payBusy || !canPayRegistration}
                  onClick={() => void startRazorpay("registration")}
                  className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Pay ₹2,500 with Razorpay
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={payBusy || !canPayRegistration}
                    onClick={() => void payMock("razorpay", "registration")}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
                  >
                    Simulated pay (dev)
                  </button>
                </>
              )}
            </div>
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="text-sm font-medium text-[var(--foreground)]">Custom payment (Razorpay)</p>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                Enter an amount in rupees (minimum ₹1). This completes your registration payment step for the amount
                you choose.
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-sm">
                  <span className="text-[var(--foreground-muted)]">Amount (₹)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customRupees}
                    onChange={(e) => setCustomRupees(e.target.value)}
                    disabled={!canPayRegistration}
                    className="mt-1 w-36 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    placeholder="e.g. 5000"
                  />
                </label>
                {razorpayReady ? (
                  <button
                    type="button"
                    disabled={payBusy || !canPayRegistration}
                    onClick={() => void startRazorpay("custom")}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
                  >
                    Pay custom amount
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {showProgramFeeBlock ? (
            <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Program fee</h3>
              <p className="text-sm text-[var(--foreground-muted)]">
                Program fee: <strong className="text-[var(--foreground)]">₹50,000</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                {razorpayReady ? (
                  <button
                    type="button"
                    disabled={payBusy}
                    onClick={() => void startRazorpay("program")}
                    className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] disabled:opacity-50"
                  >
                    Pay program fee with Razorpay
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={payBusy}
                    onClick={() => void payMock("razorpay", "program")}
                    className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] disabled:opacity-50"
                  >
                    Simulated program pay (dev)
                  </button>
                )}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setStep(1)} className="text-sm text-[var(--primary)] underline">
              Back
            </button>
            <button
              type="button"
              disabled={!programPaid}
              onClick={() => setStep(3)}
              className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue to visit schedule
            </button>
          </div>
          {!programPaid ? (
            <p className="text-xs text-[var(--foreground-muted)]">
              Complete registration and program payments to unlock visit scheduling.
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <form onSubmit={(e) => void saveVisits(e)} className="mt-8 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">College visits</h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Schedule your admission counselling visit and a campus tour. Times are saved in your local timezone.
          </p>
          <div>
            <label className="text-sm font-medium">Admission visit — date &amp; time *</label>
            <input
              type="datetime-local"
              required
              value={visitAdmission}
              onChange={(e) => setVisitAdmission(e.target.value)}
              className="mt-1 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Campus tour — date &amp; time *</label>
            <input
              type="datetime-local"
              required
              value={visitTour}
              onChange={(e) => setVisitTour(e.target.value)}
              className="mt-1 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white">
              Save and finish
            </button>
            <button type="button" onClick={() => setStep(2)} className="text-sm text-[var(--primary)] underline">
              Back
            </button>
          </div>
        </form>
      ) : null}

      {step === 4 ? (
        <div className="mt-8 space-y-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">You&apos;re all set</h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Application ID: <code className="text-[var(--foreground)]">{app.id}</code>
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">
            Status: {app.status} · Review: {app.admissionReview} · Payment: {app.paymentStatus}
          </p>
          {app.admissionVisitAt ? (
            <p className="text-sm text-[var(--foreground-muted)]">
              Admission visit: {new Date(app.admissionVisitAt).toLocaleString()}
            </p>
          ) : null}
          {app.campusTourAt ? (
            <p className="text-sm text-[var(--foreground-muted)]">
              Campus tour: {new Date(app.campusTourAt).toLocaleString()}
            </p>
          ) : null}
          <button type="button" onClick={() => setStep(3)} className="text-sm text-[var(--primary)] underline">
            Edit visit times
          </button>
        </div>
      ) : null}
    </div>
  );
}
