"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { buildAcademicYearOptions } from "@/lib/academic-year-options";
import { INDIAN_STATES_AND_UT } from "@/lib/indian-states";

type Uni = { id: string; name: string; code: string };

type Props = { universities: Uni[] };

const NAME_OK = /^[\p{L} ]+$/u;

function mapApiFieldErrors(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0]!;
    else if (typeof v === "string") out[k] = v;
  }
  return out;
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function validateConsultantForm(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  selectedCount: number;
  universitiesAvailable: number;
  academicYear: string;
  hasMouFile: boolean;
}): Record<string, string> {
  const e: Record<string, string> = {};
  const n = input.name.trim();
  if (n.length === 0) e.name = "Name is required";
  else if (!NAME_OK.test(n)) e.name = "Name must contain only letters.";
  else if (n.length < 3) e.name = "Name must be at least 3 characters";

  const em = input.email.trim();
  if (em.length === 0) e.email = "Email is required";
  else if (!looksLikeEmail(em)) e.email = "Enter a valid email address";

  const p = input.phone.trim();
  if (p.length === 0) e.phone = "Phone number is required";
  else if (!/^\d+$/.test(p)) e.phone = "Only numbers are allowed";
  else if (p.length !== 10) e.phone = "Phone number must be 10 digits";

  if (input.password.trim().length > 0 && input.password.trim().length < 8) {
    e.password = "Password must be at least 8 characters";
  }

  if (input.universitiesAvailable > 0 && input.selectedCount < 1) {
    e.universityIds = "Please select at least one university";
  }
  if (input.universitiesAvailable === 0) {
    e.universityIds = "No universities available to assign";
  }

  if (input.hasMouFile && !input.academicYear.trim()) {
    e.academicYear = "Select academic year for MOU upload";
  }

  return e;
}

export function NewConsultantForm({ universities }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  const [gstNumber, setGstNumber] = React.useState("");
  const [panNumber, setPanNumber] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [district, setDistrict] = React.useState("");
  const [state, setState] = React.useState("");
  const [academicYear, setAcademicYear] = React.useState("");
  const [mouFile, setMouFile] = React.useState<File | null>(null);
  const [selectedUniIds, setSelectedUniIds] = React.useState<Set<string>>(new Set());
  /** Fixed to standard admission partner; select is disabled until branch accounts are re-enabled. */
  const partnerRole = "consultant" as const;
  const yearOptions = React.useMemo(() => buildAcademicYearOptions(), []);

  const formSnapshot = React.useMemo(
    () => ({
      name,
      email,
      phone,
      password,
      selectedCount: selectedUniIds.size,
      universitiesAvailable: universities.length,
      academicYear,
      hasMouFile: Boolean(mouFile),
    }),
    [name, email, phone, password, selectedUniIds.size, universities.length, academicYear, mouFile],
  );

  const formValid = React.useMemo(
    () => Object.keys(validateConsultantForm(formSnapshot)).length === 0,
    [formSnapshot],
  );

  function borderFor(key: string) {
    return fieldErrors[key] ? "border-red-500" : "border-[var(--border)]";
  }

  function toggleUniversity(id: string) {
    setSelectedUniIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setFieldErrors((f) => {
      const n = { ...f };
      delete n.universityIds;
      return n;
    });
  }

  function selectAllUniversities() {
    setSelectedUniIds(new Set(universities.map((u) => u.id)));
    setFieldErrors((f) => {
      const n = { ...f };
      delete n.universityIds;
      return n;
    });
  }

  function clearUniversities() {
    setSelectedUniIds(new Set());
    setFieldErrors((f) => {
      const n = { ...f };
      delete n.universityIds;
      return n;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clientErr = validateConsultantForm(formSnapshot);
    if (Object.keys(clientErr).length > 0) {
      setFieldErrors(clientErr);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim() || undefined,
        universityIds: [...selectedUniIds],
        partnerRole,
        companyName: companyName.trim() || undefined,
        designation: designation.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
        panNumber: panNumber.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        state: state.trim() || undefined,
        academicYear: academicYear.trim() || undefined,
      };

      let body: BodyInit;
      if (mouFile) {
        const form = new FormData();
        form.set("payload", JSON.stringify(payload));
        form.set("mouFile", mouFile);
        body = form;
      } else {
        body = JSON.stringify(payload);
      }

      const res = await fetch("/api/master/consultants", {
        method: "POST",
        headers: mouFile ? undefined : { "Content-Type": "application/json" },
        body,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: unknown;
      };
      if (!res.ok) {
        const apiFe = mapApiFieldErrors(data.fieldErrors);
        if (Object.keys(apiFe).length > 0) setFieldErrors(apiFe);
        setError(data.error ?? "Could not create admission partner");
        return;
      }
      router.push("/dashboard/master/consultants");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const uniSectionInvalid = Boolean(fieldErrors.universityIds);

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-5" noValidate>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Account type</label>
        <select
          value={partnerRole}
          disabled
          title="Account type is fixed to standard admission partner. Contact engineering for branch accounts."
          className="mt-1 w-full cursor-not-allowed rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 text-[var(--foreground)] opacity-80"
        >
          <option value="consultant">Standard admission partner</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Name</label>
        <input
          type="text"
          inputMode="text"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\p{L} ]/gu, "");
            setName(v);
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.name;
              return n;
            });
          }}
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("name")}`}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Email</label>
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
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("email")}`}
          aria-invalid={Boolean(fieldErrors.email)}
        />
        {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Phone number</label>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.phone;
              return n;
            });
          }}
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("phone")}`}
          aria-invalid={Boolean(fieldErrors.phone)}
        />
        {fieldErrors.phone ? <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p> : null}
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Company profile</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Company name</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Designation</label>
            <input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">GST number</label>
            <input
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">PAN number</label>
            <input
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">District</label>
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="">Select state</option>
              {INDIAN_STATES_AND_UT.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">MOU by academic year</h2>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">PDF or DOC, max 2 MB. Academic year required when uploading.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Academic year</label>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setFieldErrors((f) => {
                  const n = { ...f };
                  delete n.academicYear;
                  return n;
                });
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor("academicYear")}`}
            >
              <option value="">Select year</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {fieldErrors.academicYear ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.academicYear}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">MOU document</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              onChange={(e) => setMouFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-[var(--foreground-muted)]"
            />
            {mouFile ? <p className="mt-1 text-xs text-[var(--foreground-muted)]">{mouFile.name}</p> : null}
          </div>
        </div>
      </section>

      <div>
        <span className="block text-sm font-medium text-[var(--foreground)]">Assigned universities</span>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          Select one, several, or all. Partners with multiple assignments can switch the active university in their hub.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllUniversities}
            className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearUniversities}
            className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Clear
          </button>
        </div>
        <ul
          id="assigned-universities-list"
          aria-describedby={fieldErrors.universityIds ? "university-ids-error" : undefined}
          className={`mt-3 max-h-56 space-y-2 overflow-y-auto rounded-lg border bg-[var(--background)] p-3 ${
            uniSectionInvalid ? "border-red-500" : "border-[var(--border)]"
          }`}
        >
          {universities.length === 0 ? (
            <li className="text-sm text-[var(--foreground-muted)]">No universities available.</li>
          ) : (
            universities.map((u) => (
              <li key={u.id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={selectedUniIds.has(u.id)}
                    onChange={() => toggleUniversity(u.id)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border)]"
                  />
                  <span>
                    {u.name}{" "}
                    <span className="text-xs text-[var(--foreground-muted)]">({u.code})</span>
                  </span>
                </label>
              </li>
            ))
          )}
        </ul>
        {fieldErrors.universityIds ? (
          <p id="university-ids-error" className="mt-1 text-xs text-red-600" role="alert">
            {fieldErrors.universityIds}
          </p>
        ) : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.password;
              return n;
            });
          }}
          placeholder="Leave blank to auto-generate"
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("password")}`}
          aria-invalid={Boolean(fieldErrors.password)}
        />
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">Minimum 8 characters if set manually.</p>
        {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || !formValid}
        className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send email & create"}
      </button>
    </form>
  );
}
