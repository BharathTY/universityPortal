"use client";

import * as React from "react";
import { buildSelectableYopYearLabels } from "@/lib/academic-year-yop";

const MOU_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const MOU_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PHOTO_ACCEPT = "image/png,image/jpeg,image/jpg";

type UniversityMouDocumentsSectionProps = {
  academicYear: string;
  onAcademicYearChange: (value: string) => void;
  mouFile: File | null;
  onMouFileChange: (file: File | null) => void;
  eventPhotos: File[];
  onEventPhotosChange: (files: File[]) => void;
  disabled?: boolean;
  fieldErrors?: Record<string, string>;
};

function FilePicker({
  id,
  label,
  hint,
  accept,
  multiple,
  disabled,
  onFiles,
}: {
  id: string;
  label: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
            {label}
          </label>
          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{hint}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--muted)]/50 disabled:opacity-50"
        >
          {multiple ? "Choose files" : "Choose file"}
        </button>
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function UniversityMouDocumentsSection({
  academicYear,
  onAcademicYearChange,
  mouFile,
  onMouFileChange,
  eventPhotos,
  onEventPhotosChange,
  disabled,
  fieldErrors = {},
}: UniversityMouDocumentsSectionProps) {
  const [mouError, setMouError] = React.useState<string | null>(null);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const yearOptions = React.useMemo(() => buildSelectableYopYearLabels(), []);

  function pickMou(files: File[]) {
    setMouError(null);
    const file = files[0];
    if (!file) {
      onMouFileChange(null);
      return;
    }
    if (file.size > MOU_MAX_BYTES) {
      setMouError("MOU must be 2 MB or smaller");
      return;
    }
    onMouFileChange(file);
  }

  function pickPhotos(files: File[]) {
    setPhotoError(null);
    const valid: File[] = [];
    for (const file of files) {
      if (file.size > PHOTO_MAX_BYTES) {
        setPhotoError(`Each photo must be 2 MB or smaller (${file.name} is too large)`);
        return;
      }
      valid.push(file);
    }
    onEventPhotosChange(valid);
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">MOU, event photos &amp; academic year</h2>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        Pick an intake year, then attach the MOU and event photos for that year.
      </p>

      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          <label htmlFor="doc-academic-year" className="text-sm font-medium text-[var(--foreground)]">
            Academic year (YOP)
          </label>
          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
            Required when uploading MOU or event photos.
          </p>
          <select
            id="doc-academic-year"
            value={academicYear}
            onChange={(e) => onAcademicYearChange(e.target.value)}
            disabled={disabled}
            className={`mt-2 w-full max-w-xs rounded-lg border bg-[var(--card)] px-3 py-2 text-sm ${
              fieldErrors.academicYear ? "border-red-500" : "border-[var(--border)]"
            }`}
          >
            <option value="">Select year…</option>
            {yearOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          {fieldErrors.academicYear ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.academicYear}</p>
          ) : null}
        </div>

        <FilePicker
          id="mou-file"
          label="MOU"
          hint="PDF or Word document, max 2 MB"
          accept={MOU_ACCEPT}
          disabled={disabled}
          onFiles={pickMou}
        />
        {mouFile ? (
          <div className="flex items-center justify-between gap-2 rounded-md bg-[var(--muted)]/30 px-3 py-2 text-sm">
            <span className="truncate text-[var(--foreground)]">{mouFile.name}</span>
            <span className="shrink-0 text-xs text-[var(--foreground-muted)]">{formatBytes(mouFile.size)}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onMouFileChange(null)}
              className="shrink-0 text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : null}
        {mouError ? <p className="text-xs text-red-600">{mouError}</p> : null}

        <FilePicker
          id="event-photos"
          label="Event photos"
          hint="PNG or JPG, max 2 MB each — multiple files allowed"
          accept={PHOTO_ACCEPT}
          multiple
          disabled={disabled}
          onFiles={pickPhotos}
        />
        {eventPhotos.length > 0 ? (
          <ul className="space-y-1.5">
            {eventPhotos.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-2 rounded-md bg-[var(--muted)]/30 px-3 py-2 text-sm"
              >
                <span className="truncate text-[var(--foreground)]">{file.name}</span>
                <span className="shrink-0 text-xs text-[var(--foreground-muted)]">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onEventPhotosChange(eventPhotos.filter((_, i) => i !== index))}
                  className="shrink-0 text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {photoError ? <p className="text-xs text-red-600">{photoError}</p> : null}
      </div>
    </section>
  );
}
