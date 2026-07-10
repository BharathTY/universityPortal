"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { UniversityDetailsSection } from "@/components/university-details-section";
import {
  validateUniversityDetailsPayload,
  type UniversityDetailsPayload,
} from "@/lib/university-details-api";
import type { ProgramCatalogSnapshot } from "@/lib/qspiders-program-catalog";
import { getFallbackProgramCatalog } from "@/lib/qspiders-program-catalog";
import {
  MasterUniversityCatalogCombobox,
  type MasterCatalogItem,
} from "@/components/master-university-catalog-combobox";
import { UniversitySpocEditor } from "@/components/university-spoc-editor";
import { UniversityStreamEntryEditor } from "@/components/university-stream-entry-editor";
import { UniversityHostelDetailsSection } from "@/components/university-hostel-details-section";
import { UniversityScholarshipEditor } from "@/components/university-scholarship-editor";
import { UniversityMouDocumentsSection } from "@/components/university-mou-documents-section";
import { UniversityMouSpocEditor } from "@/components/university-mou-spoc-editor";
import {
  createEmptyStreamEntry,
  streamEntriesToCreatePayload,
  validateStreamEntries,
  type StreamEntry,
} from "@/lib/stream-entry-payload";
import {
  emptyHostelDetailsState,
  hostelEntriesFoodFee,
  hostelEntriesToHostelFeesForm,
  validateHostelDetailsState,
  type HostelDetailsState,
} from "@/lib/university-hostel-details";
import {
  completeUniversityMouSpocRows,
  createEmptyUniversityMouSpocDraft,
  validateUniversityMouSpocRows,
  type UniversityMouSpocDraft,
} from "@/lib/university-mou-spoc";
import type { MouTenure } from "@prisma/client";
import {
  validateMouDocuments,
  type MouDocumentDraft,
} from "@/lib/university-mou-documents";
import type { UniversityEditWizardData } from "@/lib/university-edit-wizard-data";
import {
  validateUniversityPhone,
} from "@/lib/university-phone";
import {
  createEmptyUniversitySpocDraft,
  completeUniversitySpocRows,
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

import {
  UNIVERSITY_LOGO_ACCEPT,
  validateUniversityLogoFile,
} from "@/lib/university-logo";

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

export function NewUniversityWizard({
  initialMasterId,
  universityId,
}: {
  initialMasterId?: string;
  universityId?: string;
}) {
  const router = useRouter();
  const editMode = Boolean(universityId);
  const [editLoading, setEditLoading] = React.useState(editMode);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [universityCode, setUniversityCode] = React.useState("");
  const [existingMouCount, setExistingMouCount] = React.useState(0);
  const [existingMouDocuments, setExistingMouDocuments] = React.useState<
    { fileName: string; fileUrl: string }[]
  >([]);
  const [existingEventPhotos, setExistingEventPhotos] = React.useState<
    { fileName: string; fileUrl: string }[]
  >([]);
  const [step, setStep] = React.useState<1 | 2>(1);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [selectedMaster, setSelectedMaster] = React.useState<MasterSearchItem | null>(null);

  const [name, setName] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [state, setState] = React.useState("");
  const [district, setDistrict] = React.useState("");
  const [city, setCity] = React.useState("");
  const [area, setArea] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [universityType, setUniversityType] = React.useState("");
  const [detailsReady, setDetailsReady] = React.useState(false);

  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [spocRows, setSpocRows] = React.useState<UniversitySpocDraft[]>(() => [createEmptyUniversitySpocDraft()]);

  const [streamEntries, setStreamEntries] = React.useState<StreamEntry[]>([createEmptyStreamEntry()]);
  const [programCatalog, setProgramCatalog] = React.useState<ProgramCatalogSnapshot | null>(null);
  const [programCatalogLoading, setProgramCatalogLoading] = React.useState(true);
  const [hostelDetails, setHostelDetails] = React.useState<HostelDetailsState>(() => emptyHostelDetailsState());
  const [targetStudents, setTargetStudents] = React.useState("");
  const [scholarshipEntries, setScholarshipEntries] = React.useState<ScholarshipEntry[]>(() => [
    createEmptyScholarshipEntry(),
  ]);

  const [logoUrl, setLogoUrl] = React.useState("");
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [logoFileError, setLogoFileError] = React.useState<string | null>(null);
  const [mouSpocRows, setMouSpocRows] = React.useState<UniversityMouSpocDraft[]>(() => [
    createEmptyUniversityMouSpocDraft(),
  ]);
  const [mouYear, setMouYear] = React.useState("");
  const [mouTenure, setMouTenure] = React.useState<MouTenure | "">("");
  const [mouFiles, setMouFiles] = React.useState<MouDocumentDraft[]>([]);
  const [eventPhotos, setEventPhotos] = React.useState<File[]>([]);

  const selectedMasterId = selectedMaster?.id ?? null;

  React.useEffect(() => {
    setProgramCatalogLoading(true);
    void fetch("/api/catalog/program")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProgramCatalogSnapshot | null) => {
        if (data?.qualificationTypes?.length) setProgramCatalog(data);
      })
      .catch(() => undefined)
      .finally(() => setProgramCatalogLoading(false));
  }, []);

  React.useEffect(() => {
    if (!initialMasterId || selectedMasterId || editMode) return;
    void fetch(`/api/master/master-universities/${encodeURIComponent(initialMasterId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { item?: MasterSearchItem } | null) => {
        if (data?.item) onMasterSelected(data.item);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when opening with ?masterId=
  }, [initialMasterId]);

  const applyEditData = React.useCallback((data: UniversityEditWizardData) => {
    setUniversityCode(data.code);
    setName(data.name);
    setLocation(data.location);
    setState(data.state);
    setDistrict(data.district);
    setCity(data.city);
    setArea(data.area);
    setPincode(data.pincode);
    setWebsite(data.website);
    setUniversityType(data.universityType);
    setEmail(data.email);
    setPhone(data.phone);
    setLogoUrl(data.logoUrl);
    setLogoPreview(data.logoUrl || null);
    setSpocRows(data.spocRows);
    setStreamEntries(data.streamEntries);
    setTargetStudents(data.targetStudents);
    setHostelDetails(data.hostelDetails);
    setScholarshipEntries(data.scholarshipEntries);
    setMouSpocRows(data.mouSpocRows);
    setMouYear(data.mouYear);
    setMouTenure(data.mouTenure);
    setExistingMouCount(data.existingMouCount);
    setExistingMouDocuments(data.existingMouDocuments);
    setExistingEventPhotos(data.existingEventPhotos);
    setDetailsReady(true);
    if (data.masterUniversityId) {
      setSelectedMaster({
        id: data.masterUniversityId,
        name: data.name,
        state: data.state || "",
        district: data.district || "",
        address: data.location || null,
        city: data.city || null,
        pincode: data.pincode || null,
        website: data.website || null,
        universityType: data.universityType || "",
      });
    }
  }, []);

  React.useEffect(() => {
    if (!universityId) return;
    let cancelled = false;
    setEditLoading(true);
    setEditError(null);
    void fetch(`/api/master/universities/${universityId}/edit-data`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as UniversityEditWizardData & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not load university");
        if (!cancelled) applyEditData(json);
      })
      .catch((err) => {
        if (!cancelled) setEditError(err instanceof Error ? err.message : "Could not load university");
      })
      .finally(() => {
        if (!cancelled) setEditLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [universityId, applyEditData]);

  const applyDetailsLoaded = React.useCallback((details: UniversityDetailsPayload) => {
    setName(details.universityName);
    setLocation(details.location);
    setState(details.state);
    setDistrict(details.district);
    setCity(details.city);
    setArea(details.area);
    setPincode(details.pincode);
    setWebsite(details.website ?? "");
    setUniversityType(details.universityType ?? "");
    if (details.contactNumber) setPhone(details.contactNumber);
    if (details.email) setEmail(details.email);
    if (details.logoUrl) {
      setLogoUrl((current) => current || details.logoUrl || "");
      setLogoPreview((current) => current || details.logoUrl);
    }
    setDetailsReady(true);
    setFieldErrors((f) => {
      const next = { ...f };
      delete next.masterUniversity;
      delete next.details;
      delete next.universityName;
      delete next.location;
      delete next.state;
      delete next.district;
      delete next.city;
      delete next.area;
      delete next.pincode;
      return next;
    });
  }, []);

  const clearDetailsState = React.useCallback(() => {
    setName("");
    setLocation("");
    setState("");
    setDistrict("");
    setCity("");
    setArea("");
    setPincode("");
    setWebsite("");
    setUniversityType("");
    setDetailsReady(false);
  }, []);

  function onMasterSelected(item: MasterSearchItem) {
    setSelectedMaster(item);
    clearDetailsState();
    setEmail("");
    setPhone("");
    setLogoUrl("");
    setLogoPreview(null);
    setLogoFileError(null);
    setFieldErrors((f) => {
      const next = { ...f };
      delete next.masterUniversity;
      delete next.details;
      return next;
    });
  }

  function clearMasterSelection() {
    setSelectedMaster(null);
    clearDetailsState();
    setEmail("");
    setPhone("");
    setLogoUrl("");
    setLogoPreview(null);
    setLogoFileError(null);
  }

  const masterLocked = Boolean(selectedMasterId);

  function validateStep1(): Record<string, string> {
    const e: Record<string, string> = {};
    if (editMode) {
      if (!detailsReady) {
        e.details = "University details are still loading";
      } else {
        Object.assign(
          e,
          validateUniversityDetailsPayload({
            universityName: name,
            location,
            state,
            district,
            city,
            area,
            pincode,
            contactNumber: phone,
            email,
            logoUrl: logoUrl || null,
            website: website || null,
            universityType: universityType || null,
            source: "catalog",
          }),
        );
      }
    } else if (!selectedMasterId) {
      e.masterUniversity = "Select a university from the master list";
    } else if (!detailsReady) {
      e.details = "University details are still loading";
    } else {
      Object.assign(
        e,
        validateUniversityDetailsPayload({
          universityName: name,
          location,
          state,
          district,
          city,
          area,
          pincode,
          contactNumber: phone,
          email,
          logoUrl: logoUrl || null,
          website: website || null,
          universityType: universityType || null,
          source: "catalog",
        }),
      );
    }
    const em = email.trim();
    if (em.length > 0 && !looksLikeEmail(em)) e.email = "Enter a valid email address";
    const phoneError = validateUniversityPhone(phone);
    if (phoneError) e.phone = phoneError;
    if (logoFileError) e.logoFile = logoFileError;
    return e;
  }

  function validateStep2(): Record<string, string> {
    const e: Record<string, string> = {};
    Object.assign(e, validateUniversitySpocRows(spocRows));
    Object.assign(
      e,
      validateStreamEntries(streamEntries, programCatalog ?? getFallbackProgramCatalog()),
    );
    Object.assign(e, validateHostelDetailsState(hostelDetails));
    Object.assign(e, validateScholarshipEntries(scholarshipEntries));
    Object.assign(e, validateUniversityMouSpocRows(mouSpocRows));
    Object.assign(e, validateMouDocuments({ mouYear, mouTenure, mouFiles, eventPhotos }, { existingMouCount }));
    return e;
  }

  async function goToStep2() {
    setError(null);
    const e = validateStep1();
    if (Object.keys(e).length > 0) {
      setFieldErrors(e);
      return;
    }
    setFieldErrors({});

    const em = email.trim();
    if (em) {
      setBusy(true);
      try {
        const params = new URLSearchParams({ email: em });
        if (universityId) params.set("excludeUniversityId", universityId);
        const res = await fetch(`/api/master/universities/email-available?${params}`);
        const data = (await res.json().catch(() => ({}))) as {
          available?: boolean;
          error?: string;
          fieldErrors?: unknown;
        };
        if (!res.ok || data.available === false) {
          const apiFe = mapApiFieldErrors(data.fieldErrors);
          setFieldErrors({
            email: apiFe.email ?? data.error ?? "Email is already in use",
          });
          return;
        }
      } catch {
        setError("Could not verify email uniqueness. Please try again.");
        return;
      } finally {
        setBusy(false);
      }
    }

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
      const streamPayload = streamEntriesToCreatePayload(
        streamEntries,
        hostelEntriesToHostelFeesForm(hostelDetails.entries),
        {
          targetStudents,
          foodFee: hostelEntriesFoodFee(hostelDetails.entries),
        },
      );
      const filledStreams = streamEntries.filter(
        (entry) => entry.programName.trim().length > 0 && entry.streamName.trim().length > 0,
      );
      const streamDetailsWithIds = streamPayload.streamDetails.map((detail, index) => ({
        ...detail,
        id: filledStreams[index]?.id,
      }));

      const payload: Record<string, unknown> = {
        name: name.trim(),
        masterUniversityId: selectedMasterId,
        location: location.trim() || null,
        state: state.trim() || null,
        district: district.trim() || null,
        city: city.trim() || null,
        area: area.trim() || null,
        pincode: pincode.trim() || null,
        universityType: universityType || null,
        website: website.trim() || null,
        email: email.trim() || undefined,
        phone: phone.trim(),
        spocs: completeUniversitySpocRows(spocRows).map((row) => ({
          name: row.name.trim(),
          designation: row.designation.trim(),
          mobile: row.mobile.trim(),
          email: row.email.trim(),
        })),
        ...streamPayload,
        streamDetails: streamDetailsWithIds,
        scholarships: scholarshipsToPayload(scholarshipEntries),
        mouSpocs: completeUniversityMouSpocRows(mouSpocRows).map((row) => ({
          name: row.name.trim(),
          designation: row.designation.trim(),
          mobile: row.mobile.trim(),
          email: row.email.trim(),
        })),
        mouYear: mouYear.trim() || null,
        mouTenure: mouTenure || null,
        logoUrl: logoUrl.trim() || null,
      };

      const body = new FormData();
      body.set("payload", JSON.stringify(payload));
      for (const draft of mouFiles) body.append("mouFiles", draft.file);
      for (const photo of eventPhotos) body.append("eventPhotos", photo);

      const res = await fetch(
        editMode && universityId ? `/api/master/universities/${universityId}/full` : "/api/master/universities",
        { method: editMode ? "PUT" : "POST", body },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: unknown;
      };
      if (!res.ok) {
        const apiFe = mapApiFieldErrors(data.fieldErrors);
        if (Object.keys(apiFe).length > 0) setFieldErrors(apiFe);
        setError(data.error ?? (editMode ? "Could not update university" : "Could not create university"));
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
    const logoError = validateUniversityLogoFile(file);
    if (logoError) {
      setLogoFileError(logoError);
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

  const locked = busy || editLoading;

  const preloadedUniversityDetails = React.useMemo((): UniversityDetailsPayload | null => {
    if (!editMode || !detailsReady) return null;
    return {
      universityName: name,
      location,
      state,
      district,
      city,
      area,
      pincode,
      contactNumber: phone,
      email,
      logoUrl: logoUrl || null,
      website: website || null,
      universityType: universityType || null,
      source: "catalog",
    };
  }, [
    editMode,
    detailsReady,
    name,
    location,
    state,
    district,
    city,
    area,
    pincode,
    phone,
    email,
    logoUrl,
    website,
    universityType,
  ]);

  if (editLoading) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-sm text-[var(--foreground-muted)]">
        Loading university details…
      </div>
    );
  }

  if (editError) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
        {editError}
      </div>
    );
  }

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
          University details
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
          {editMode ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-4 py-3">
              <p className="text-sm font-medium text-[var(--foreground)]">{name}</p>
              {universityCode ? (
                <p className="mt-0.5 font-mono text-xs text-[var(--foreground-muted)]">{universityCode}</p>
              ) : null}
            </div>
          ) : (
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
                  onChange={onMasterSelected}
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
          )}

          <UniversityDetailsSection
            masterUniversityId={editMode ? null : selectedMasterId}
            preloadedDetails={preloadedUniversityDetails}
            email={email}
            phone={phone}
            logoUrl={logoUrl}
            logoPreview={logoPreview}
            logoFileError={logoFileError}
            fieldErrors={fieldErrors}
            disabled={locked}
            onDetailsLoaded={applyDetailsLoaded}
            onDetailsCleared={clearDetailsState}
            onEmailChange={(value) => {
              setEmail(value);
              setFieldErrors((f) => {
                if (!f.email) return f;
                const next = { ...f };
                delete next.email;
                return next;
              });
            }}
            onPhoneChange={setPhone}
            pincode={pincode}
            onPincodeChange={(value) => {
              setPincode(value);
              setFieldErrors((f) => {
                if (!f.pincode) return f;
                const next = { ...f };
                delete next.pincode;
                return next;
              });
            }}
            onLogoPick={onLogoPick}
            onClearLogo={() => {
              setLogoUrl("");
              setLogoPreview(null);
              setLogoFileError(null);
            }}
          />

          {fieldErrors.details ? (
            <p className="text-sm text-red-600">{fieldErrors.details}</p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => void goToStep2()}
              disabled={locked || busy}
              className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
            >
              {busy ? "Checking email…" : "Continue to organisation details"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-8" noValidate>
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
            catalog={programCatalog}
            catalogLoading={programCatalogLoading}
            targetStudents={targetStudents}
            onTargetStudentsChange={setTargetStudents}
            disabled={locked}
            fieldErrors={fieldErrors}
          />

          <UniversityHostelDetailsSection
            value={hostelDetails}
            onChange={setHostelDetails}
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

          <UniversityScholarshipEditor
            entries={scholarshipEntries}
            onChange={setScholarshipEntries}
            disabled={locked}
            fieldErrors={fieldErrors}
          />

          <UniversityMouSpocEditor
            rows={mouSpocRows}
            onChange={setMouSpocRows}
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

          <UniversityMouDocumentsSection
            mouYear={mouYear}
            onMouYearChange={setMouYear}
            mouTenure={mouTenure}
            onMouTenureChange={setMouTenure}
            mouFiles={mouFiles}
            onMouFilesChange={setMouFiles}
            eventPhotos={eventPhotos}
            onEventPhotosChange={setEventPhotos}
            disabled={locked}
            fieldErrors={fieldErrors}
          />

          {editMode && (existingMouDocuments.length > 0 || existingEventPhotos.length > 0) ? (
            <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Existing MOU &amp; event files</h3>
              {existingMouDocuments.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {existingMouDocuments.map((doc) => (
                    <li key={doc.fileUrl}>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--primary)] hover:underline"
                      >
                        {doc.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {existingEventPhotos.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {existingEventPhotos.map((doc) => (
                    <li key={doc.fileUrl}>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--primary)] hover:underline"
                      >
                        {doc.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                Upload new files above only when you need to add or replace documents.
              </p>
            </section>
          ) : null}

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
              {busy ? (editMode ? "Saving…" : "Creating…") : editMode ? "Save changes" : "Create university"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
