"use client";

import * as React from "react";
import type { UniversityDetailsPayload } from "@/lib/university-details-api";
import { resolveWebsiteHref } from "@/lib/website-url";
import { stripUniversityPhoneInput } from "@/lib/university-phone";
import {
  UNIVERSITY_LOGO_ACCEPT,
} from "@/lib/university-logo";

type Props = {
  masterUniversityId: string | null;
  email: string;
  phone: string;
  logoUrl: string;
  logoPreview: string | null;
  logoFileError: string | null;
  fieldErrors: Record<string, string>;
  disabled?: boolean;
  /** When set, skip catalog fetch and show these details (edit mode). */
  preloadedDetails?: UniversityDetailsPayload | null;
  onDetailsLoaded: (details: UniversityDetailsPayload) => void;
  onDetailsCleared: () => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  pincode: string;
  onPincodeChange: (value: string) => void;
  onLogoPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearLogo: () => void;
};

function borderFor(fieldErrors: Record<string, string>, key: string) {
  return fieldErrors[key] ? "border-red-500" : "border-[var(--border)]";
}

function ReadOnlyField({
  label,
  value,
  required,
}: {
  label: string;
  value: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--foreground-muted)]">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <input
        value={value || "—"}
        readOnly
        tabIndex={-1}
        className="mt-1 w-full cursor-not-allowed rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 text-[var(--foreground)]"
      />
    </div>
  );
}

export function UniversityDetailsSection({
  masterUniversityId,
  email,
  phone,
  logoUrl,
  logoPreview,
  logoFileError,
  fieldErrors,
  disabled,
  preloadedDetails,
  onDetailsLoaded,
  onDetailsCleared,
  onEmailChange,
  onPhoneChange,
  pincode,
  onPincodeChange,
  onLogoPick,
  onClearLogo,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [details, setDetails] = React.useState<UniversityDetailsPayload | null>(null);

  React.useEffect(() => {
    if (preloadedDetails) {
      setDetails(preloadedDetails);
      setError(null);
      setLoading(false);
      return;
    }

    if (!masterUniversityId) {
      setDetails(null);
      setError(null);
      onDetailsCleared();
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch(`/api/master/master-universities/${encodeURIComponent(masterUniversityId)}/details`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          details?: UniversityDetailsPayload;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Could not load university details");
        }
        if (!data.details) {
          throw new Error("No university details returned");
        }
        return data.details;
      })
      .then((payload) => {
        if (cancelled) return;
        setDetails(payload);
        onDetailsLoaded(payload);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetails(null);
        setError(err instanceof Error ? err.message : "Could not load university details");
        onDetailsCleared();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [masterUniversityId, onDetailsCleared, onDetailsLoaded, preloadedDetails]);

  if (!masterUniversityId && !preloadedDetails) return null;

  return (
    <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">University details</h2>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          Pre-filled from the university details API. Contact number, email, and logo can be updated below.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--foreground-muted)]">Loading university details…</p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {details && !loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ReadOnlyField label="University name" value={details.universityName} required />
              {fieldErrors.universityName ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.universityName}</p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--foreground-muted)]">
                University location <span className="text-red-600">*</span>
              </label>
              <textarea
                value={details.location || "—"}
                readOnly
                tabIndex={-1}
                rows={2}
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 text-[var(--foreground)]"
              />
              {fieldErrors.location ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.location}</p>
              ) : null}
            </div>

            <ReadOnlyField label="State" value={details.state} required />
            {fieldErrors.state ? <p className="text-xs text-red-600 sm:col-span-2">{fieldErrors.state}</p> : null}

            <ReadOnlyField label="District" value={details.district} required />
            {fieldErrors.district ? (
              <p className="text-xs text-red-600 sm:col-span-2">{fieldErrors.district}</p>
            ) : null}

            <ReadOnlyField label="City" value={details.city} required />
            {fieldErrors.city ? <p className="text-xs text-red-600 sm:col-span-2">{fieldErrors.city}</p> : null}

            <ReadOnlyField label="Area" value={details.area} required />
            {fieldErrors.area ? <p className="text-xs text-red-600 sm:col-span-2">{fieldErrors.area}</p> : null}

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Pincode <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={pincode}
                onChange={(e) => onPincodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit PIN"
                className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, "pincode")}`}
                disabled={disabled}
                aria-invalid={Boolean(fieldErrors.pincode)}
              />
              {fieldErrors.pincode ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.pincode}</p>
              ) : (
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                  {pincode.length === 6
                    ? "Valid 6-digit pincode."
                    : "Required when not available from catalog — enter 6 digits."}
                </p>
              )}
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
                onChange={(e) => onPhoneChange(stripUniversityPhoneInput(e.target.value))}
                className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, "phone")}`}
                disabled={disabled}
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              {fieldErrors.phone ? <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p> : (
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">Must be 10 digits.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">University email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 ${borderFor(fieldErrors, "email")}`}
                disabled={disabled}
                placeholder="name@university.edu"
              />
              {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">University logo upload</label>
            <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
              JPG, JPEG, or PNG only. Maximum file size 2 MB.
            </p>
            <input
              type="file"
              accept={UNIVERSITY_LOGO_ACCEPT}
              onChange={onLogoPick}
              disabled={disabled}
              className="mt-2 block w-full text-sm"
            />
            {logoFileError ? <p className="mt-1 text-xs text-red-600">{logoFileError}</p> : null}
            {(logoPreview || details.logoUrl) && !logoFileError ? (
              <div className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview ?? details.logoUrl ?? ""}
                  alt=""
                  className="h-14 w-14 rounded-lg border object-contain"
                />
                <div className="flex flex-col gap-1">
                  <label className="cursor-pointer text-xs font-semibold text-[var(--primary)] hover:underline">
                    Replace logo
                    <input
                      type="file"
                      accept={UNIVERSITY_LOGO_ACCEPT}
                      onChange={onLogoPick}
                      disabled={disabled}
                      className="sr-only"
                    />
                  </label>
                  {logoUrl || logoPreview ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={onClearLogo}
                      className="text-left text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remove uploaded logo
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {details.source === "catalog" ? (
            <p className="text-xs text-[var(--foreground-muted)]">
              External API not configured — showing catalog data. Set{" "}
              <code className="rounded bg-[var(--muted)] px-1 py-0.5">UNIVERSITY_DETAILS_API_URL</code> when ready.
            </p>
          ) : (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">Loaded from external university details API.</p>
          )}

          {details.website?.trim() ? (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)]">Website</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">{details.website}</span>
                <a
                  href={resolveWebsiteHref(details.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  Open
                </a>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
