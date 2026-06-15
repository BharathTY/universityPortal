"use client";

import * as React from "react";
import {
  buildMouYearOptions,
  createMouDocumentDraft,
  EVENT_PHOTO_ACCEPT,
  EVENT_PHOTO_MAX_BYTES,
  MOU_PDF_ACCEPT,
  MOU_PDF_MAX_BYTES,
  MOU_TENURE_OPTIONS,
  validateEventPhotoFile,
  validateMouPdfFile,
  type MouDocumentDraft,
} from "@/lib/university-mou-documents";
import type { MouTenure } from "@prisma/client";

type UniversityMouDocumentsSectionProps = {
  mouYear: string;
  onMouYearChange: (value: string) => void;
  mouTenure: MouTenure | "";
  onMouTenureChange: (value: MouTenure | "") => void;
  mouFiles: MouDocumentDraft[];
  onMouFilesChange: (files: MouDocumentDraft[]) => void;
  eventPhotos: File[];
  onEventPhotosChange: (files: File[]) => void;
  disabled?: boolean;
  fieldErrors?: Record<string, string>;
};

function fieldClass(hasError: boolean, extra = "") {
  return `mt-0.5 w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm ${extra} ${
    hasError ? "border-red-500" : "border-[var(--border)]"
  }`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function useObjectUrl(file: File | null | undefined) {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}

function PreviewButton({ file, label }: { file: File; label: string }) {
  const previewUrl = useObjectUrl(file);

  if (!previewUrl) return null;

  return (
    <button
      type="button"
      onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
      className="shrink-0 text-xs font-medium text-[var(--primary)] hover:underline"
    >
      Preview {label}
    </button>
  );
}

function ImagePreviewThumb({ file }: { file: File }) {
  const previewUrl = useObjectUrl(file);
  if (!previewUrl) return null;

  return (
    <button
      type="button"
      onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
      className="shrink-0 overflow-hidden rounded-md border border-[var(--border)]"
      title="Preview image"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={previewUrl} alt="" className="h-10 w-10 object-cover" />
    </button>
  );
}

export function UniversityMouDocumentsSection({
  mouYear,
  onMouYearChange,
  mouTenure,
  onMouTenureChange,
  mouFiles,
  onMouFilesChange,
  eventPhotos,
  onEventPhotosChange,
  disabled,
  fieldErrors = {},
}: UniversityMouDocumentsSectionProps) {
  const [localError, setLocalError] = React.useState<string | null>(null);
  const mouInputRef = React.useRef<HTMLInputElement>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const yearOptions = React.useMemo(() => buildMouYearOptions(), []);

  function addMouFiles(files: File[]) {
    setLocalError(null);
    const next = [...mouFiles];
    for (const file of files) {
      const error = validateMouPdfFile(file);
      if (error) {
        setLocalError(error);
        return;
      }
      next.push(createMouDocumentDraft(file));
    }
    onMouFilesChange(next);
  }

  function removeMouFile(id: string) {
    onMouFilesChange(mouFiles.filter((item) => item.id !== id));
  }

  function addEventPhotos(files: File[]) {
    setLocalError(null);
    const next = [...eventPhotos];
    for (const file of files) {
      const error = validateEventPhotoFile(file);
      if (error) {
        setLocalError(error);
        return;
      }
      next.push(file);
    }
    onEventPhotosChange(next);
  }

  function removeEventPhoto(index: number) {
    onEventPhotosChange(eventPhotos.filter((_, i) => i !== index));
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Document uploads</h2>

      <div className="mt-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">MOU details</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mou-year" className="block text-xs font-medium text-[var(--foreground-muted)]">
                MOU year <span className="text-red-600">*</span>
              </label>
              <select
                id="mou-year"
                value={mouYear}
                disabled={disabled}
                onChange={(e) => onMouYearChange(e.target.value)}
                aria-invalid={Boolean(fieldErrors.mouYear)}
                className={fieldClass(Boolean(fieldErrors.mouYear), "max-w-xs")}
              >
                <option value="">Select year…</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {fieldErrors.mouYear ? <p className="mt-1 text-xs text-red-600">{fieldErrors.mouYear}</p> : null}
            </div>

            <div>
              <label htmlFor="mou-tenure" className="block text-xs font-medium text-[var(--foreground-muted)]">
                MOU tenure <span className="text-red-600">*</span>
              </label>
              <select
                id="mou-tenure"
                value={mouTenure}
                disabled={disabled}
                onChange={(e) => onMouTenureChange(e.target.value as MouTenure | "")}
                aria-invalid={Boolean(fieldErrors.mouTenure)}
                className={fieldClass(Boolean(fieldErrors.mouTenure), "max-w-xs")}
              >
                <option value="">Select tenure…</option>
                {MOU_TENURE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldErrors.mouTenure ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.mouTenure}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  MOU upload <span className="text-red-600">*</span>
                </p>
                <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                  PDF only, up to {(MOU_PDF_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB per file. Multiple documents allowed.
                </p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => mouInputRef.current?.click()}
                className="shrink-0 text-sm font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
              >
                + Add more MOU documents
              </button>
            </div>
            <input
              ref={mouInputRef}
              type="file"
              accept={MOU_PDF_ACCEPT}
              multiple
              disabled={disabled}
              className="sr-only"
              onChange={(e) => {
                addMouFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />

            {mouFiles.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {mouFiles.map((draft) => (
                  <li
                    key={draft.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[var(--muted)]/30 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-[var(--foreground)]">{draft.file.name}</span>
                    <span className="shrink-0 text-xs text-[var(--foreground-muted)]">
                      {formatBytes(draft.file.size)}
                    </span>
                    <PreviewButton file={draft.file} label="MOU" />
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeMouFile(draft.id)}
                      className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete uploaded MOU document
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={() => mouInputRef.current?.click()}
                className="mt-3 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground-muted)] hover:bg-[var(--muted)]/20 disabled:opacity-50"
              >
                Choose MOU PDF
              </button>
            )}
            {fieldErrors.mouFiles ? <p className="mt-2 text-xs text-red-600">{fieldErrors.mouFiles}</p> : null}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Event photos</h3>
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Event photos</p>
                <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                  JPG, JPEG, or PNG — up to {(EVENT_PHOTO_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB per image. Multiple
                  images allowed.
                </p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => photoInputRef.current?.click()}
                className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--muted)]/50 disabled:opacity-50"
              >
                Choose files
              </button>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept={EVENT_PHOTO_ACCEPT}
              multiple
              disabled={disabled}
              className="sr-only"
              onChange={(e) => {
                addEventPhotos(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />

            {eventPhotos.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {eventPhotos.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex flex-wrap items-center gap-2 rounded-md bg-[var(--muted)]/30 px-3 py-2 text-sm"
                  >
                    <ImagePreviewThumb file={file} />
                    <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">{file.name}</span>
                    <span className="shrink-0 text-xs text-[var(--foreground-muted)]">{formatBytes(file.size)}</span>
                    <PreviewButton file={file} label="image" />
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeEventPhoto(index)}
                      className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {fieldErrors.eventPhotos ? <p className="mt-2 text-xs text-red-600">{fieldErrors.eventPhotos}</p> : null}
          </div>
        </div>
      </div>

      {localError ? <p className="mt-3 text-xs text-red-600">{localError}</p> : null}
    </section>
  );
}
