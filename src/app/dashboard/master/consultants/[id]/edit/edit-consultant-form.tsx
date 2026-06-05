"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { buildAcademicYearOptions } from "@/lib/academic-year-options";
import { INDIAN_STATES_AND_UT } from "@/lib/indian-states";
import { normalizeGstNumber, normalizePanNumber, validateGstNumber, validatePanNumber } from "@/lib/indian-tax-ids";
import type { ConsultantSpocSummary } from "@/lib/consultant-spoc";

type Uni = { id: string; name: string; code: string };

type MouDoc = { fileName: string; fileUrl: string; academicYear: string };

type Props = {
  userId: string;
  universities: Uni[];
  initial: {
    name: string;
    email: string;
    phone: string;
    universityIds: string[];
    accountStatus: "ACTIVE" | "INACTIVE";
    companyName: string;
    designation: string;
    gstNumber: string;
    panNumber: string;
    address: string;
    city: string;
    district: string;
    state: string;
    academicYear: string;
    mouDocuments: MouDoc[];
    spocs: ConsultantSpocSummary[];
  };
};

export function EditConsultantForm({ userId, universities, initial }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [name, setName] = React.useState(initial.name);
  const [email, setEmail] = React.useState(initial.email);
  const [phone, setPhone] = React.useState(initial.phone);
  const [selectedUniIds, setSelectedUniIds] = React.useState<Set<string>>(new Set(initial.universityIds));
  const [accountStatus, setAccountStatus] = React.useState<"ACTIVE" | "INACTIVE">(initial.accountStatus);
  const [companyName, setCompanyName] = React.useState(initial.companyName);
  const [designation, setDesignation] = React.useState(initial.designation);
  const [gstNumber, setGstNumber] = React.useState(initial.gstNumber);
  const [panNumber, setPanNumber] = React.useState(initial.panNumber);
  const [address, setAddress] = React.useState(initial.address);
  const [city, setCity] = React.useState(initial.city);
  const [district, setDistrict] = React.useState(initial.district);
  const [state, setState] = React.useState(initial.state);
  const [academicYear, setAcademicYear] = React.useState(initial.academicYear);
  const [mouFile, setMouFile] = React.useState<File | null>(null);
  const yearOptions = React.useMemo(() => buildAcademicYearOptions(), []);

  function toggleUniversity(id: string) {
    setSelectedUniIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fe: Record<string, string> = {};
    const gstErr = validateGstNumber(gstNumber);
    if (gstErr) fe.gstNumber = gstErr;
    const panErr = validatePanNumber(panNumber);
    if (panErr) fe.panNumber = panErr;
    if (mouFile && !academicYear.trim()) fe.academicYear = "Select academic year for MOU upload";
    if (Object.keys(fe).length > 0) {
      setFieldErrors(fe);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const payload = {
        name,
        email,
        phone,
        universityIds: [...selectedUniIds],
        accountStatus,
        companyName: companyName.trim() || undefined,
        designation: designation.trim() || undefined,
        gstNumber: gstNumber.trim() ? normalizeGstNumber(gstNumber) : undefined,
        panNumber: panNumber.trim() ? normalizePanNumber(panNumber) : undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        state: state.trim() || undefined,
        academicYear: academicYear.trim() || undefined,
      };

      let body: BodyInit;
      let headers: HeadersInit | undefined;
      if (mouFile) {
        const form = new FormData();
        form.set("payload", JSON.stringify(payload));
        form.set("mouFile", mouFile);
        body = form;
      } else {
        body = JSON.stringify(payload);
        headers = { "Content-Type": "application/json" };
      }

      const res = await fetch(`/api/master/consultants/${userId}`, {
        method: "PATCH",
        headers,
        body,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; fieldErrors?: Record<string, string[]> };
      if (!res.ok) {
        if (data.fieldErrors) {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(data.fieldErrors)) {
            if (Array.isArray(v) && v[0]) mapped[k] = v[0];
          }
          setFieldErrors(mapped);
        }
        setError(data.error ?? "Could not save");
        return;
      }
      router.push("/dashboard/master/consultants");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input type="tel" required maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value as "ACTIVE" | "INACTIVE")} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <h2 className="text-lg font-semibold">Company &amp; tax</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Company name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Designation</label>
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">GST number</label>
            <input value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase())} className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${fieldErrors.gstNumber ? "border-red-500" : "border-[var(--border)]"}`} />
            {fieldErrors.gstNumber ? <p className="mt-1 text-xs text-red-600">{fieldErrors.gstNumber}</p> : null}
          </div>
          <div>
            <label className="block text-sm font-medium">PAN number</label>
            <input value={panNumber} onChange={(e) => setPanNumber(e.target.value.toUpperCase())} className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${fieldErrors.panNumber ? "border-red-500" : "border-[var(--border)]"}`} />
            {fieldErrors.panNumber ? <p className="mt-1 text-xs text-red-600">{fieldErrors.panNumber}</p> : null}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Address</label>
          <textarea value={address} rows={2} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">District</label>
            <input value={district} onChange={(e) => setDistrict(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">State</label>
            <select value={state} onChange={(e) => setState(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
              <option value="">Select state</option>
              {INDIAN_STATES_AND_UT.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <h2 className="text-lg font-semibold">MOU</h2>
        {initial.mouDocuments.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {initial.mouDocuments.map((doc) => (
              <li key={`${doc.fileUrl}-${doc.academicYear}`}>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-[var(--primary)] underline">
                  {doc.fileName}
                </a>
                <span className="text-[var(--foreground-muted)]"> · {doc.academicYear}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--foreground-muted)]">No MOU on file.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Academic year (for new MOU)</label>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${fieldErrors.academicYear ? "border-red-500" : "border-[var(--border)]"}`}>
              <option value="">Select year</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {fieldErrors.academicYear ? <p className="mt-1 text-xs text-red-600">{fieldErrors.academicYear}</p> : null}
          </div>
          <div>
            <label className="block text-sm font-medium">Upload MOU (optional)</label>
            <input type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(e) => setMouFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" />
            {mouFile ? <p className="mt-1 text-xs text-[var(--foreground-muted)]">{mouFile.name}</p> : null}
          </div>
        </div>
      </section>

      {initial.spocs.length > 0 ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-lg font-semibold">Consultant SPOCs</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {initial.spocs.map((spoc) => (
              <li key={spoc.id} className="rounded-lg border border-[var(--border)] px-3 py-2">
                <span className="font-medium">{spoc.name ?? spoc.email}</span>
                {spoc.designation ? <span className="text-[var(--foreground-muted)]"> · {spoc.designation}</span> : null}
                <div className="text-xs text-[var(--foreground-muted)]">{spoc.email} · {spoc.accountStatus}</div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-lg font-semibold">Assigned universities</h2>
        <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
          {universities.map((u) => (
            <li key={u.id}>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="checkbox" checked={selectedUniIds.has(u.id)} onChange={() => toggleUniversity(u.id)} className="mt-0.5" />
                <span>{u.name} <span className="text-xs text-[var(--foreground-muted)]">({u.code})</span></span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={busy} className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
