"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { normalizeIndianState } from "@/lib/indian-states";
import {
  MasterUniversityCatalogCombobox,
  type MasterCatalogItem,
} from "@/components/master-university-catalog-combobox";
import { UniversitySpocEditor } from "@/components/university-spoc-editor";
import { UniversityStreamEntryEditor } from "@/components/university-stream-entry-editor";
import { UniversityScholarshipEditor } from "@/components/university-scholarship-editor";
import { UniversityMouDocumentsSection } from "@/components/university-mou-documents-section";
import {
  createEmptyStreamEntry,
  emptyHostelFeesForm,
  streamEntriesToCreatePayload,
  validateStreamEntries,
  type HostelFeesForm,
  type StreamEntry,
} from "@/lib/stream-entry-payload";
import { buildSelectableYopYearLabels } from "@/lib/academic-year-yop";
import {
  stripUniversityPhoneInput,
  validateUniversityPhone,
} from "@/lib/university-phone";
import { resolveWebsiteHref } from "@/lib/website-url";
import {
  createEmptyUniversitySpocDraft,
  filledUniversitySpocRows,
  validateUniversitySpocRows,
  type UniversitySpocDraft,
} from "@/lib/university-spoc";
import {
  createEmptyScholarshipEntry,
  scholarshipsToPayload,
  validateScholarshipEntries,
  type ScholarshipEntry,
} from "@/lib/university-scholarship";

type MasterSearchItem = MasterCatalogItem;

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

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

function borderFor(fieldErrors: Record<string, string>, key: string) {
  return fieldErrors[key] ? "border-red-500" : "border-[var(--border)]";
}

function formatUniversityTypeLabel(raw: string): string {
  switch (raw) {
    case "PRIVATE":
      return "Private";
    case "DEEMED":
      return "Deemed";
    case "STATE_GOVT":
      return "State / Central Govt";
    default:
      return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

async function uploadLogoFile(file: File): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  const res = await fetch("/api/master/universities/logo", {
    method: "POST",
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  if (!data.url) throw new Error("No URL returned");
  return data.url;
}

export function NewUniversityWizard({ initialMasterId }: { initialMasterId?: string }) {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [selectedMaster, setSelectedMaster] = React.useState<MasterSearchItem | null>(null);

  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [state, setState] = React.useState("");
  const [district, setDistrict] = React.useState("");
  const [city, setCity] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [universityType, setUniversityType] = React.useState("");

  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [spocRows, setSpocRows] = React.useState<UniversitySpocDraft[]>(() => [createEmptyUniversitySpocDraft()]);

  const [streamEntries, setStreamEntries] = React.useState<StreamEntry[]>([createEmptyStreamEntry()]);
  const [hostelFees, setHostelFees] = React.useState<HostelFeesForm>(emptyHostelFeesForm());
  const [targetStudentsUg, setTargetStudentsUg] = React.useState("");
  const [targetStudentsPg, setTargetStudentsPg] = React.useState("");
  const [foodFee, setFoodFee] = React.useState("");
  const [scholarshipEntries, setScholarshipEntries] = React.useState<ScholarshipEntry[]>(() => [
    createEmptyScholarshipEntry(),
  ]);

  const [logoUrl, setLogoUrl] = React.useState("");
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [logoFileError, setLogoFileError] = React.useState<string | null>(null);
  const [mouFile, setMouFile] = React.useState<File | null>(null);
  const [eventPhotos, setEventPhotos] = React.useState<File[]>([]);
  const [academicYear, setAcademicYear] = React.useState(() => {
    const years = buildSelectableYopYearLabels();
    return years[0] ?? "";
  });

  const selectedMasterId = selectedMaster?.id ?? null;

  React.useEffect(() => {
    if (!initialMasterId || selectedMasterId) return;
    void fetch(`/api/master/master-universities/${encodeURIComponent(initialMasterId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { item?: MasterSearchItem } | null) => {
        if (data?.item) applyMasterSelection(data.item);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when opening with ?masterId=
  }, [initialMasterId]);

  function applyMasterSelection(item: MasterSearchItem) {
    setSelectedMaster(item);
    setName(item.name);
    setAddress(item.address ?? "");
    setState(normalizeIndianState(item.state));
    setDistrict(item.district);
    setCity(item.city ?? item.district);
    setPincode(item.pincode ?? "");
    setWebsite(item.website ?? "");
    setUniversityType(item.universityType);
    setFieldErrors((f) => {
      const n = { ...f };
      delete n.masterUniversity;
      delete n.name;
      return n;
    });
  }

  function clearMasterSelection() {
    setSelectedMaster(null);
    setName("");
    setAddress("");
    setState("");
    setDistrict("");
    setCity("");
    setPincode("");
    setWebsite("");
    setUniversityType("");
  }

  const masterLocked = Boolean(selectedMasterId);
  const readOnlyFieldClass =
    "bg-[var(--muted)]/50 text-[var(--foreground)] cursor-not-allowed border-[var(--border)]";

  function validateStep1(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!selectedMasterId) {
      e.masterUniversity = "Select a university from the master list";
    } else if (name.trim().length === 0) {
      e.name = "University name is required";
    }
    return e;
  }

  function validateStep2(): Record<string, string> {
    const e: Record<string, string> = {};
    const em = email.trim();
    if (em.length > 0 && !looksLikeEmail(em)) e.email = "Enter a valid email address";
    const phoneError = validateUniversityPhone(phone);
    if (phoneError) e.phone = phoneError;
    Object.assign(e, validateUniversitySpocRows(spocRows));
    Object.assign(e, validateStreamEntries(streamEntries));
    Object.assign(e, validateScholarshipEntries(scholarshipEntries));
    if ((mouFile || eventPhotos.length > 0) && !academicYear.trim()) {
      e.academicYear = "Select an academic year for MOU and event photos";
    }
    if (logoFileError) e.logoFile = logoFileError;
    return e;
  }

  function goToStep2() {
    setError(null);
    const e = validateStep1();
    if (Object.keys(e).length > 0) {
      setFieldErrors(e);
      return;
    }
    setFieldErrors({});
    setStep(2);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const e1 = validateStep1();
    const e2 = validateStep2();
    const merged = { ...e1, ...e2 };
    if (Object.keys(merged).length > 0) {
      setFieldErrors(merged);
      if (Object.keys(e1).length > 0) setStep(1);
      return;
    }
    setFieldErrors({});
    setBusy(true);

    try {
      const streamPayload = streamEntriesToCreatePayload(streamEntries, hostelFees, {
        targetStudentsUg,
        targetStudentsPg,
        foodFee,
      });

      const payload: Record<string, unknown> = {
        name: name.trim(),
        masterUniversityId: selectedMasterId,
        address: address.trim() || null,
        state: state.trim() || null,
        district: district.trim() || null,
        city: city.trim() || null,
        pincode: pincode.trim() || null,
        universityType: universityType || null,
        website: website.trim() || null,
        email: email.trim() || undefined,
        phone: phone.trim(),
        spocs: filledUniversitySpocRows(spocRows).map((row) => ({
          name: row.name.trim(),
          designation: row.designation.trim(),
          mobile: row.mobile.trim(),
          email: row.email.trim(),
        })),
        ...streamPayload,
        scholarships: scholarshipsToPayload(scholarshipEntries),
        academicYearLabel: academicYear.trim() || null,
        logoUrl: logoUrl.trim() || null,
      };

      const body = new FormData();
      body.set("payload", JSON.stringify(payload));
      if (mouFile) body.set("mouFile", mouFile);
      for (const photo of eventPhotos) body.append("eventPhotos", photo);

      const res = await fetch("/api/master/universities", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: unknown;
      };
      if (!res.ok) {
        const apiFe = mapApiFieldErrors(data.fieldErrors);
        if (Object.keys(apiFe).length > 0) setFieldErrors(apiFe);
        setError(data.error ?? "Could not create university");
        return;
      }
      router.push("/dashboard/master/universities");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function onLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    setError(null);
    setLogoFileError(null);
    const mime = file.type || "";
    if (!LOGO_ALLOWED_MIME.has(mime)) {
      setLogoFileError("Only PNG, JPG, JPEG, SVG, or WEBP files are allowed");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoFileError("File size should not exceed 2 MB");
      return;
    }
    void (async () => {
      try {
        const url = await uploadLogoFile(file);
        setLogoUrl(url);
        setLogoPreview(url);
      } catch (err) {
        setLogoFileError(err instanceof Error ? err.message : "Could not upload logo");
      }
    })();
  }

  const locked = busy;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center gap-3">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
            step === 1 ? "bg-[var(--accent-blue)] text-white" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          1
        </span>
        <span className={`text-sm font-medium ${step === 1 ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`}>
          Search & location
        </span>
        <span className="h-px flex-1 bg-[var(--border)]" />
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
            step === 2 ? "bg-[var(--accent-blue)] text-white" : "bg-[var(--muted)] text-[var(--foreground-muted)]"
          }`}
        >
          2
        </span>
        <span className={`text-sm font-medium ${step === 2 ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`}>
          Organisation details
        </span>
      </div>

      {step === 1 ? (
        <div className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">
              University <span className="text-[var(--primary)]">*</span>
            </label>
            <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
              Choose from the master catalog. Search inside the dropdown to filter 1,300+ universities.
            </p>
            <div className="mt-3">
              <MasterUniversityCatalogCombobox
                value={selectedMaster}
                onChange={applyMasterSelection}
                disabled={locked}
                error={fieldErrors.masterUniversity}
                openUp={false}
              />
            </div>
            {masterLocked ? (
              <button
                type="button"
                onClick={clearMasterSelection}
                disabled={locked}
                className="mt-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
              >
                Change selection
              </button>
            ) : null}
          </div>

          {masterLocked ? (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)]">University name</label>
                <input
                  value={name}
                  readOnly
                  tabIndex={-1}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 ${readOnlyFieldClass}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)]">Address</label>
                <textarea
                  value={address}
                  readOnly
                  tabIndex={-1}
                  rows={2}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 ${readOnlyFieldClass}`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground-muted)]">State</label>
                  <input
                    value={state}
                    readOnly
                    tabIndex={-1}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 ${readOnlyFieldClass}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground-muted)]">District</label>
                  <input
                    value={district}
                    readOnly
                    tabIndex={-1}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 ${readOnlyFieldClass}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground-muted)]">City</label>
                  <input
                    value={city}
                    readOnly
                    tabIndex={-1}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 ${readOnlyFieldClass}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground-muted)]">Pincode</label>
                  <input
                    value={pincode || "—"}
                    readOnly
                    tabIndex={-1}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 ${readOnlyFieldClass}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground-muted)]">University type</label>
                  <input
                    value={universityType ? formatUniversityTypeLabel(universityType) : "—"}
                    readOnly
                    tabIndex={-1}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 ${readOnlyFieldClass}`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[var(--foreground-muted)]">Website</label>
                  {website.trim() ? (
                    <div className={`mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 ${readOnlyFieldClass}`}>
                      <span className="min-w-0 flex-1 truncate text-sm">{website}</span>
                      <a
                        href={resolveWebsiteHref(website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-sm font-medium text-[var(--primary)] hover:underline"
                      >
                        Open
                      </a>
                    </div>
                  ) : (
                    <input
                      value="—"
                      readOnly
                      tabIndex={-1}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 ${readOnlyFieldClass}`}
                    />
                  )}
                </div>
              </div>
              <p className="text-xs text-[var(--foreground-muted)]">
                Details are loaded from the master catalog and cannot be edited here.
              </p>
            </>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={goToStep2}
              disabled={locked}
              className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
            >
              Continue to details
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-8" noValidate>
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Account & contact</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[var(--foreground)]">University admin email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, "email")}`}
                  disabled={locked}
                />
                {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  University contact number <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  value={phone}
                  onChange={(e) => setPhone(stripUniversityPhoneInput(e.target.value))}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, "phone")}`}
                  disabled={locked}
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
                {fieldErrors.phone ? <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p> : null}
              </div>
            </div>
          </section>

          <UniversitySpocEditor
            rows={spocRows}
            onChange={setSpocRows}
            fieldErrors={fieldErrors}
            onClearFieldError={(key) =>
              setFieldErrors((f) => {
                const next = { ...f };
                delete next[key];
                return next;
              })
            }
            disabled={locked}
          />

          <UniversityStreamEntryEditor
            entries={streamEntries}
            onChange={setStreamEntries}
            hostelFees={hostelFees}
            onHostelChange={setHostelFees}
            targetStudentsUg={targetStudentsUg}
            targetStudentsPg={targetStudentsPg}
            onTargetStudentsUgChange={setTargetStudentsUg}
            onTargetStudentsPgChange={setTargetStudentsPg}
            foodFee={foodFee}
            onFoodFeeChange={setFoodFee}
            disabled={locked}
            fieldErrors={fieldErrors}
          />

          <UniversityScholarshipEditor
            entries={scholarshipEntries}
            onChange={setScholarshipEntries}
            disabled={locked}
            fieldErrors={fieldErrors}
          />

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Logo</h2>
            <div className="mt-4">
              <label className="block text-sm font-medium">Logo (optional)</label>
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" onChange={onLogoPick} disabled={locked} className="mt-2 block w-full text-sm" />
              {logoFileError ? <p className="mt-1 text-xs text-red-600">{logoFileError}</p> : null}
              {logoPreview ? (
                <div className="mt-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="" className="h-14 w-14 rounded-lg border object-contain" />
                  <div className="flex flex-col gap-1">
                    <label className="cursor-pointer text-xs font-semibold text-[var(--primary)] hover:underline">
                      Replace logo
                      <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" onChange={onLogoPick} disabled={locked} className="sr-only" />
                    </label>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setLogoUrl("");
                        setLogoPreview(null);
                        setLogoFileError(null);
                      }}
                      className="text-left text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete logo
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <UniversityMouDocumentsSection
            academicYear={academicYear}
            onAcademicYearChange={setAcademicYear}
            mouFile={mouFile}
            onMouFileChange={setMouFile}
            eventPhotos={eventPhotos}
            onEventPhotosChange={setEventPhotos}
            disabled={locked}
            fieldErrors={fieldErrors}
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={locked}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted)]/50 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={locked}
              className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create university"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
