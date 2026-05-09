"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ConsultantBulkCsvPanel } from "@/components/consultant-bulk-csv-panel";
import { INDIAN_STATES_AND_UT } from "@/lib/indian-states";

type Stream = { id: string; name: string };
type AcademicYearOption = { id: string; label: string };

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
  /** POST `/api/auth/active-university` when the scoped university changes (multi-university consultants). */
  setActiveUniversityOnMount?: boolean;
  showBulkUpload?: boolean;
  hubLayout?: boolean;
  /** With `hubLayout`, show add-lead in a right-side panel instead of a card. */
  addLeadInDrawer?: boolean;
  leadDrawerOpen?: boolean;
  onCloseLeadDrawer?: () => void;
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
  refEmail: string;
  refPhone: string;
  academicYearsCount: number;
  streamsCount: number;
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
    e.academicYearId = "No academic year (YOP) is configured for this university";
  } else if (!input.academicYearId) {
    e.academicYearId = "Select the year (YOP)";
  }
  if (!input.admissionState) e.admissionState = "Select state";
  const nat = input.nationality.trim();
  if (!nat) e.nationality = "Nationality is required";

  const rE = input.refEmail.trim();
  if (rE && !looksLikeEmail(rE)) e.referralEmail = "Enter a valid email address";
  const rP = input.refPhone.trim();
  if (rP && rP.replace(/\D/g, "").length < 10) e.referralPhone = "Enter at least 10 digits for contact";

  return e;
}

export function ConsultantLeadsClient(props: Props) {
  const showBulk = props.showBulkUpload ?? false;
  const setActive = props.setActiveUniversityOnMount ?? false;
  const academicYears = props.academicYears ?? [];
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<LeadRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [fn, setFn] = React.useState("");
  const [ln, setLn] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [nat, setNat] = React.useState("India");
  const [streamId, setStreamId] = React.useState(props.streams[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = React.useState(academicYears[0]?.id ?? "");
  const [admissionState, setAdmissionState] = React.useState("");
  const [refFn, setRefFn] = React.useState("");
  const [refLn, setRefLn] = React.useState("");
  const [refPhone, setRefPhone] = React.useState("");
  const [refEmail, setRefEmail] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  function borderFor(key: string) {
    return fieldErrors[key] ? "border-red-500" : "border-[var(--border)]";
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ universityId: props.universityId });
      const res = await fetch(`/api/consultant/leads?${qs.toString()}`);
      const data = (await res.json().catch(() => ({}))) as { error?: string; leads?: LeadRow[] };
      if (!res.ok) {
        setError(data.error ?? "Could not load leads");
        return;
      }
      setRows(data.leads ?? []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, [props.universityId]);

  React.useEffect(() => {
    const first = props.streams[0]?.id ?? "";
    setStreamId((prev) => (props.streams.some((s) => s.id === prev) ? prev : first));
  }, [props.streams]);

  React.useEffect(() => {
    const first = academicYears[0]?.id ?? "";
    setAcademicYearId((prev) => (academicYears.some((y) => y.id === prev) ? prev : first));
  }, [academicYears]);

  React.useEffect(() => {
    if (!setActive || !props.universityId) return;
    void (async () => {
      await fetch("/api/auth/active-university", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universityId: props.universityId }),
      });
      router.refresh();
    })();
  }, [setActive, props.universityId, router]);

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
      refEmail,
      refPhone,
      academicYearsCount: academicYears.length,
      streamsCount: props.streams.length,
    });
    if (Object.keys(clientErr).length > 0) {
      setFieldErrors(clientErr);
      return;
    }
    setFieldErrors({});

    const res = await fetch("/api/consultant/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        universityId: props.universityId,
        academicYearId: academicYearId || undefined,
        firstName: fn.trim(),
        lastName: ln.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        nationality: nat.trim() || null,
        streamId,
        admissionState,
        referralFirstName: refFn.trim() || null,
        referralLastName: refLn.trim() || null,
        referralPhone: refPhone.trim() || null,
        referralEmail: refEmail.trim() || null,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      fieldErrors?: unknown;
    };
    if (!res.ok) {
      const apiFe = mapApiFieldErrors(data.fieldErrors);
      if (Object.keys(apiFe).length > 0) setFieldErrors(apiFe);
      setError(data.error ?? "Could not create lead");
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
    setFieldErrors({});
    setAcademicYearId(academicYears[0]?.id ?? "");
    await load();
    props.onCloseLeadDrawer?.();
  }

  const showAssignedPartnerCol = rows.some((r) =>
    Object.prototype.hasOwnProperty.call(r, "assignedPartnerDisplayName"),
  );

  function referralSummary(r: LeadRow): string {
    const parts = [r.referralFirstName, r.referralLastName].filter(Boolean);
    if (parts.length === 0 && !r.referralPhone && !r.referralEmail) return "—";
    return [parts.join(" "), r.referralPhone, r.referralEmail].filter(Boolean).join(" · ");
  }

  const showInlineAdd = !props.hubLayout || !props.addLeadInDrawer;
  const drawerAdd = Boolean(props.hubLayout && props.addLeadInDrawer);

  const canSubmitLead =
    props.streams.length > 0 &&
    Boolean(streamId) &&
    academicYears.length > 0 &&
    Boolean(academicYearId);

  const addLeadForm = (
    <form onSubmit={onCreate} className={drawerAdd ? "space-y-6" : "mt-4 space-y-6"} noValidate>
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
            {props.streams.length === 0 ? <option value="">No programs configured</option> : null}
            {props.streams.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {fieldErrors.streamId ? <p className="mt-1 text-xs text-red-600">{fieldErrors.streamId}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium">Year (YOP)</label>
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

      <button
        type="submit"
        disabled={!canSubmitLead}
        className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Add lead
      </button>
    </form>
  );

  return (
    <div className={props.hubLayout ? "" : "mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"}>
      {!props.hubLayout ? (
        <>
          <nav className="text-sm text-[var(--foreground-muted)]">
            <Link href="/dashboard/university" className="text-[var(--primary)] underline-offset-2 hover:underline">
              Universities
            </Link>
            <span className="mx-1.5">/</span>
            <span className="font-medium text-[var(--foreground)]">Partner leads</span>
          </nav>
          <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Leads</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            {props.universityName} ({props.universityCode})
          </p>
        </>
      ) : (
        <h2 className="text-xl font-bold text-[var(--foreground)]">Partner leads</h2>
      )}

      {props.hubLayout ? (
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          {props.universityName} ({props.universityCode})
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {drawerAdd && !props.leadDrawerOpen ? (
        <p className="mt-6 text-sm text-[var(--foreground-muted)]">
          Click <strong className="text-[var(--foreground)]">+ Lead</strong> on a university card above to open the lead
          form.
        </p>
      ) : null}

      {showInlineAdd ? (
        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Add lead</h2>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Admission partner name is recorded automatically from your account.
          </p>
          {addLeadForm}
        </section>
      ) : null}

      {drawerAdd && props.leadDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close lead form"
            onClick={() => props.onCloseLeadDrawer?.()}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Add lead</h2>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {props.universityName} ({props.universityCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => props.onCloseLeadDrawer?.()}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-4 text-sm text-[var(--foreground-muted)]">
                Your partner name is stored automatically on the lead.
              </p>
              {addLeadForm}
            </div>
          </aside>
        </div>
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

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Your leads</h2>
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
                {rows.map((r) => (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
