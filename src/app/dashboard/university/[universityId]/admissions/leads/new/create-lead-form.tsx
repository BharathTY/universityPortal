"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

const NATIONALITIES = [
  "India",
  "Nepal",
  "Bangladesh",
  "Sri Lanka",
  "Other",
] as const;

type YearOpt = { id: string; label: string };
type StreamOpt = { id: string; name: string };
type AttributionRoleOpt = { id: string; slug: string; name: string };

type Props = {
  universityId: string;
  years: YearOpt[];
  streams: StreamOpt[];
  /** Partner roles only (consultant, counsellor, …) for “By consultant”. */
  attributionRoles: AttributionRoleOpt[];
};

export function CreateLeadForm({ universityId, years, streams, attributionRoles }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [academicYearId, setAcademicYearId] = React.useState(years[0]?.id ?? "");
  const [streamId, setStreamId] = React.useState(streams[0]?.id ?? "");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [nationality, setNationality] = React.useState<string>(NATIONALITIES[0]!);
  const [specialization, setSpecialization] = React.useState("");
  const [admissionGuideName, setAdmissionGuideName] = React.useState("");
  const [admissionBy, setAdmissionBy] = React.useState<"consultant" | "university">("consultant");
  const [partnerRoleId, setPartnerRoleId] = React.useState<string>(attributionRoles[0]?.id ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/university/${universityId}/admission-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId,
          streamId,
          firstName,
          lastName,
          email,
          mobile,
          admissionGuideName,
          admissionBy,
          ...(admissionBy === "consultant" ? { consultantRoleId: partnerRoleId } : {}),
          nationality,
          specialization: specialization.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create lead");
        return;
      }
      router.push(`/dashboard/university/${universityId}/admissions`);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const back = `/dashboard/university/${universityId}/admissions`;
  const masterIntake = "/dashboard/master/universities";

  if (!attributionRoles.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[var(--foreground)]">
          Role directory is missing admission partner roles. Run the database seed (
          <code className="rounded bg-[var(--muted)] px-1">npm run db:seed</code>).
        </p>
        <Link href={back} className="mt-6 inline-block text-sm font-medium text-[var(--primary)] underline">
          Back to admissions
        </Link>
      </div>
    );
  }

  if (!years.length || !streams.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[var(--foreground)]">
          Add at least one academic year and one degree (program) for this university from the{" "}
          <Link className="font-medium underline" href={masterIntake}>
            Master portal — Universities
          </Link>{" "}
          (open the university card → Academic years / Degree).
        </p>
        <Link href={back} className="mt-6 inline-block text-sm font-medium text-[var(--primary)] underline">
          Back to admissions
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href={back} className="text-sm font-medium text-[var(--primary)] underline underline-offset-2">
        ← Admissions
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Create lead</h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        Enter lead details. Admission guide name is stored on the lead for reporting.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">First name</label>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Last name</label>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Mobile number</label>
          <input
            required
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Nationality</label>
          <select
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
          >
            {NATIONALITIES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Academic year</label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Degree</label>
            <select
              value={streamId}
              onChange={(e) => setStreamId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              {streams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Specialization</label>
          <input
            required
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder="e.g. Computer Science"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Admission guide name</label>
          <input
            required
            value={admissionGuideName}
            onChange={(e) => setAdmissionGuideName(e.target.value)}
            placeholder="e.g. Jane Doe or desk code"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Admission by</label>
          <select
            value={admissionBy}
            onChange={(e) => setAdmissionBy(e.target.value as "consultant" | "university")}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
          >
            <option value="consultant">1. By consultant</option>
            <option value="university">2. By university</option>
          </select>
        </div>
        {admissionBy === "consultant" ? (
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Partner role</label>
            <select
              value={partnerRoleId}
              onChange={(e) => setPartnerRoleId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              required
            >
              {attributionRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              Directory role used for partner attribution on this lead.
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--accent-blue)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
