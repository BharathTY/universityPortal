"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { INDIAN_STATES_AND_UT } from "@/lib/indian-states";

type MasterSearchItem = {
  id: string;
  name: string;
  state: string;
  district: string;
  address: string | null;
  city: string | null;
  pincode: string | null;
  universityType: string;
};

type CetSeatRow = { programLevel: "UG" | "PG"; streamName: string; seatCount: string };

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

function parseOptionalFee(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function borderFor(fieldErrors: Record<string, string>, key: string) {
  return fieldErrors[key] ? "border-red-500" : "border-[var(--border)]";
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

export function NewUniversityWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchBusy, setSearchBusy] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<MasterSearchItem[]>([]);
  const [selectedMasterId, setSelectedMasterId] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [state, setState] = React.useState("");
  const [district, setDistrict] = React.useState("");
  const [city, setCity] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [universityType, setUniversityType] = React.useState("");

  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [spocName, setSpocName] = React.useState("");
  const [spocDesignation, setSpocDesignation] = React.useState("");
  const [spocMobile, setSpocMobile] = React.useState("");
  const [spocEmail, setSpocEmail] = React.useState("");

  const [offersUg, setOffersUg] = React.useState(false);
  const [offersPg, setOffersPg] = React.useState(false);
  const [ugStreams, setUgStreams] = React.useState<string[]>([""]);
  const [pgStreams, setPgStreams] = React.useState<string[]>([""]);

  const [targetStudents, setTargetStudents] = React.useState("");
  const [registrationFee, setRegistrationFee] = React.useState("");
  const [applicationFee, setApplicationFee] = React.useState("");
  const [messFee, setMessFee] = React.useState("");
  const [examFee, setExamFee] = React.useState("");
  const [otherAdminCharges, setOtherAdminCharges] = React.useState("");
  const [otherAdminAmount, setOtherAdminAmount] = React.useState("");

  const [girlsAc2, setGirlsAc2] = React.useState("");
  const [girlsAc4, setGirlsAc4] = React.useState("");
  const [girlsNonAc2, setGirlsNonAc2] = React.useState("");
  const [girlsNonAc4, setGirlsNonAc4] = React.useState("");
  const [boysAc2, setBoysAc2] = React.useState("");
  const [boysAc4, setBoysAc4] = React.useState("");
  const [boysNonAc2, setBoysNonAc2] = React.useState("");
  const [boysNonAc4, setBoysNonAc4] = React.useState("");

  const [cetSeats, setCetSeats] = React.useState<CetSeatRow[]>([
    { programLevel: "UG", streamName: "", seatCount: "" },
  ]);

  const [logoUrl, setLogoUrl] = React.useState("");
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [logoFileError, setLogoFileError] = React.useState<string | null>(null);
  const [mouFile, setMouFile] = React.useState<File | null>(null);
  const [eventPhotos, setEventPhotos] = React.useState<File[]>([]);

  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      setSearchBusy(true);
      void fetch(`/api/master/master-universities/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: { items?: MasterSearchItem[] }) => setSearchResults(data.items ?? []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchBusy(false));
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  function applyMasterSelection(item: MasterSearchItem) {
    setSelectedMasterId(item.id);
    setName(item.name);
    setAddress(item.address ?? "");
    setState(item.state);
    setDistrict(item.district);
    setCity(item.city ?? "");
    setPincode(item.pincode ?? "");
    setUniversityType(item.universityType);
    setSearchQuery(item.name);
    setSearchResults([]);
  }

  function updateStreamList(setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) {
    setter((rows) => rows.map((r, i) => (i === index ? value : r)));
  }

  function addStreamRow(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter((rows) => [...rows, ""]);
  }

  function removeStreamRow(setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) {
    setter((rows) => {
      const next = rows.filter((_, i) => i !== index);
      return next.length === 0 ? [""] : next;
    });
  }

  function updateCetSeat(index: number, patch: Partial<CetSeatRow>) {
    setCetSeats((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function validateStep1(): Record<string, string> {
    const e: Record<string, string> = {};
    if (name.trim().length === 0) e.name = "University name is required";
    return e;
  }

  function validateStep2(): Record<string, string> {
    const e: Record<string, string> = {};
    const em = email.trim();
    if (em.length > 0 && !looksLikeEmail(em)) e.email = "Enter a valid email address";
    const p = phone.trim();
    if (p.length > 0) {
      if (!/^\d+$/.test(p)) e.phone = "Only numeric values are allowed";
      else if (p.length !== 10) e.phone = "Phone number must be 10 digits";
    }
    const sm = spocMobile.trim();
    if (sm.length > 0) {
      if (!/^\d+$/.test(sm)) e.spocMobile = "Only numeric values are allowed";
      else if (sm.length !== 10) e.spocMobile = "Phone number must be 10 digits";
    }
    const se = spocEmail.trim();
    if (se.length > 0 && !looksLikeEmail(se)) e.spocEmail = "Enter a valid email address";
    const feeRaw = applicationFee.trim();
    if (feeRaw.length > 0) {
      if (!/^\d+$/.test(feeRaw)) e.applicationFee = "Enter a valid application fee";
      else if (Number(feeRaw) <= 0) e.applicationFee = "Enter a valid application fee";
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
      const ugList = ugStreams.map((s) => s.trim()).filter(Boolean);
      const pgList = pgStreams.map((s) => s.trim()).filter(Boolean);
      const cetPayload = cetSeats
        .map((r) => ({
          programLevel: r.programLevel,
          streamName: r.streamName.trim(),
          seatCount: Number(r.seatCount.trim() || "0"),
        }))
        .filter((r) => r.streamName.length > 0);

      const payload: Record<string, unknown> = {
        name: name.trim(),
        masterUniversityId: selectedMasterId,
        address: address.trim() || null,
        state: state.trim() || null,
        district: district.trim() || null,
        city: city.trim() || null,
        pincode: pincode.trim() || null,
        universityType: universityType || null,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        spocName: spocName.trim() || null,
        spocDesignation: spocDesignation.trim() || null,
        spocMobile: spocMobile.trim() || undefined,
        spocEmail: spocEmail.trim() || undefined,
        offersUg: offersUg || ugList.length > 0,
        offersPg: offersPg || pgList.length > 0,
        ugStreams: ugList,
        pgStreams: pgList,
        targetStudents: targetStudents.trim() ? Number(targetStudents.trim()) : null,
        registrationFee: parseOptionalFee(registrationFee),
        applicationFee: applicationFee.trim() ? Number(applicationFee.trim()) : undefined,
        messFee: parseOptionalFee(messFee),
        examFee: parseOptionalFee(examFee),
        otherAdminCharges: otherAdminCharges.trim() || null,
        otherAdminAmount: parseOptionalFee(otherAdminAmount),
        cetSeats: cetPayload,
        hostelFees: {
          girlsAc2: parseOptionalFee(girlsAc2),
          girlsAc4: parseOptionalFee(girlsAc4),
          girlsNonAc2: parseOptionalFee(girlsNonAc2),
          girlsNonAc4: parseOptionalFee(girlsNonAc4),
          boysAc2: parseOptionalFee(boysAc2),
          boysAc4: parseOptionalFee(boysAc4),
          boysNonAc2: parseOptionalFee(boysNonAc2),
          boysNonAc4: parseOptionalFee(boysNonAc4),
        },
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
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Search master university list</label>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type at least 2 characters…"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              disabled={locked}
            />
            {searchBusy ? (
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">Searching…</p>
            ) : searchResults.length > 0 ? (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
                {searchResults.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => applyMasterSelection(item)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--muted)]/50"
                    >
                      <span className="font-medium text-[var(--foreground)]">{item.name}</span>
                      <span className="mt-0.5 block text-xs text-[var(--foreground-muted)]">
                        {item.district}, {item.state}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchQuery.trim().length >= 2 ? (
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">No matches — fill details manually below.</p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">University name</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((f) => {
                  const n = { ...f };
                  delete n.name;
                  return n;
                });
              }}
              className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor(fieldErrors, "name")}`}
              disabled={locked}
            />
            {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              disabled={locked}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
                disabled={locked}
              >
                <option value="">Select state</option>
                {INDIAN_STATES_AND_UT.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">District</label>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
                disabled={locked}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
                disabled={locked}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">Pincode</label>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
                disabled={locked}
              />
            </div>
          </div>

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
                <label className="block text-sm font-medium text-[var(--foreground)]">Phone (optional)</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, "phone")}`}
                  disabled={locked}
                />
                {fieldErrors.phone ? <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p> : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">University SPOC</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  value={spocName}
                  onChange={(e) => setSpocName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  disabled={locked}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Designation</label>
                <input
                  value={spocDesignation}
                  onChange={(e) => setSpocDesignation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  disabled={locked}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mobile</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={spocMobile}
                  onChange={(e) => setSpocMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, "spocMobile")}`}
                  disabled={locked}
                />
                {fieldErrors.spocMobile ? <p className="mt-1 text-xs text-red-600">{fieldErrors.spocMobile}</p> : null}
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={spocEmail}
                  onChange={(e) => setSpocEmail(e.target.value)}
                  className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, "spocEmail")}`}
                  disabled={locked}
                />
                {fieldErrors.spocEmail ? <p className="mt-1 text-xs text-red-600">{fieldErrors.spocEmail}</p> : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Programs (UG / PG streams)</h2>
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={offersUg} onChange={(e) => setOffersUg(e.target.checked)} disabled={locked} />
                Offers UG
              </label>
              {offersUg || ugStreams.some((s) => s.trim()) ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[var(--foreground-muted)]">UG streams</p>
                  {ugStreams.map((row, index) => (
                    <div key={`ug-${index}`} className="flex gap-2">
                      <input
                        value={row}
                        onChange={(e) => updateStreamList(setUgStreams, index, e.target.value)}
                        placeholder="e.g. B.Tech CSE"
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                        disabled={locked}
                      />
                      <button
                        type="button"
                        onClick={() => removeStreamRow(setUgStreams, index)}
                        className="text-sm text-red-600 hover:underline"
                        disabled={locked}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addStreamRow(setUgStreams)}
                    className="text-sm font-medium text-[var(--primary)] hover:underline"
                    disabled={locked}
                  >
                    + Add UG stream
                  </button>
                </div>
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={offersPg} onChange={(e) => setOffersPg(e.target.checked)} disabled={locked} />
                Offers PG
              </label>
              {offersPg || pgStreams.some((s) => s.trim()) ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[var(--foreground-muted)]">PG streams</p>
                  {pgStreams.map((row, index) => (
                    <div key={`pg-${index}`} className="flex gap-2">
                      <input
                        value={row}
                        onChange={(e) => updateStreamList(setPgStreams, index, e.target.value)}
                        placeholder="e.g. MBA"
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                        disabled={locked}
                      />
                      <button
                        type="button"
                        onClick={() => removeStreamRow(setPgStreams, index)}
                        className="text-sm text-red-600 hover:underline"
                        disabled={locked}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addStreamRow(setPgStreams)}
                    className="text-sm font-medium text-[var(--primary)] hover:underline"
                    disabled={locked}
                  >
                    + Add PG stream
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Fees</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ["Target students", targetStudents, setTargetStudents, false],
                ["Registration fee", registrationFee, setRegistrationFee, true],
                ["Application fee", applicationFee, setApplicationFee, true],
                ["Mess fee", messFee, setMessFee, true],
                ["Exam fee", examFee, setExamFee, true],
                ["Other admin amount", otherAdminAmount, setOtherAdminAmount, true],
              ].map(([label, val, setter, isFee]) => (
                <div key={label as string}>
                  <label className="text-sm font-medium">{label as string}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={val as string}
                    onChange={(e) =>
                      (setter as React.Dispatch<React.SetStateAction<string>>)(
                        isFee ? e.target.value.replace(/[^\d.]/g, "") : e.target.value.replace(/\D/g, ""),
                      )
                    }
                    className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm tabular-nums ${
                      label === "Application fee" ? borderFor(fieldErrors, "applicationFee") : "border-[var(--border)]"
                    }`}
                    disabled={locked}
                  />
                  {label === "Application fee" && fieldErrors.applicationFee ? (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.applicationFee}</p>
                  ) : null}
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Other admin charges (description)</label>
                <input
                  value={otherAdminCharges}
                  onChange={(e) => setOtherAdminCharges(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  disabled={locked}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Hostel fee matrix</h2>
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">AC / Non-AC × 2-sharing / 4-sharing (annual)</p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {(
                [
                  ["Girls", [
                    ["AC · 2-sharing", girlsAc2, setGirlsAc2],
                    ["AC · 4-sharing", girlsAc4, setGirlsAc4],
                    ["Non-AC · 2-sharing", girlsNonAc2, setGirlsNonAc2],
                    ["Non-AC · 4-sharing", girlsNonAc4, setGirlsNonAc4],
                  ]],
                  ["Boys", [
                    ["AC · 2-sharing", boysAc2, setBoysAc2],
                    ["AC · 4-sharing", boysAc4, setBoysAc4],
                    ["Non-AC · 2-sharing", boysNonAc2, setBoysNonAc2],
                    ["Non-AC · 4-sharing", boysNonAc4, setBoysNonAc4],
                  ]],
                ] as const
              ).map(([gender, fields]) => (
                <div key={gender}>
                  <h3 className="text-sm font-semibold">{gender}</h3>
                  <div className="mt-3 space-y-3">
                    {fields.map(([label, val, setter]) => (
                      <div key={label}>
                        <label className="text-xs text-[var(--foreground-muted)]">{label}</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={val}
                          onChange={(e) => setter(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums"
                          disabled={locked}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">CET seats</h2>
              <button
                type="button"
                onClick={() => setCetSeats((rows) => [...rows, { programLevel: "UG", streamName: "", seatCount: "" }])}
                className="text-sm font-medium text-[var(--primary)] hover:underline"
                disabled={locked}
              >
                + Add row
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {cetSeats.map((row, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-12">
                  <select
                    value={row.programLevel}
                    onChange={(e) => updateCetSeat(index, { programLevel: e.target.value as "UG" | "PG" })}
                    className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm sm:col-span-2"
                    disabled={locked}
                  >
                    <option value="UG">UG</option>
                    <option value="PG">PG</option>
                  </select>
                  <input
                    value={row.streamName}
                    onChange={(e) => updateCetSeat(index, { streamName: e.target.value })}
                    placeholder="Stream name"
                    className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm sm:col-span-6"
                    disabled={locked}
                  />
                  <input
                    value={row.seatCount}
                    onChange={(e) => updateCetSeat(index, { seatCount: e.target.value.replace(/\D/g, "") })}
                    placeholder="Seats"
                    className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm tabular-nums sm:col-span-3"
                    disabled={locked}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCetSeats((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)))
                    }
                    className="text-sm text-red-600 hover:underline sm:col-span-1"
                    disabled={locked}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Documents</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium">Logo (optional)</label>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogoPick} disabled={locked} className="mt-2 block w-full text-sm" />
                {logoFileError ? <p className="mt-1 text-xs text-red-600">{logoFileError}</p> : null}
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="" className="mt-2 h-14 w-14 rounded-lg border object-contain" />
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium">MOU (PDF/DOC, max 2 MB)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf"
                  onChange={(e) => setMouFile(e.target.files?.[0] ?? null)}
                  disabled={locked}
                  className="mt-2 block w-full text-sm"
                />
                {mouFile ? <p className="mt-1 text-xs text-[var(--foreground-muted)]">{mouFile.name}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-medium">Event photos (PNG/JPG, max 2 MB each)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  multiple
                  onChange={(e) => setEventPhotos(Array.from(e.target.files ?? []))}
                  disabled={locked}
                  className="mt-2 block w-full text-sm"
                />
                {eventPhotos.length > 0 ? (
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">{eventPhotos.length} file(s) selected</p>
                ) : null}
              </div>
            </div>
          </section>

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
