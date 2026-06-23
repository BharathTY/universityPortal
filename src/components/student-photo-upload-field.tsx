"use client";

import * as React from "react";
import { validateStudentPhotoFile } from "@/lib/student-photo";

export type StudentPhotoUploadRef = {
  getFile: () => File | null;
  /** Reset after successful submit (restores existing server photo if any). */
  clear: () => void;
  /** True when the user removed the current or newly chosen photo. */
  isPhotoRemoved: () => boolean;
};

type Props = {
  existingPhotoUrl: string | null;
  apiError?: string;
  isEdit?: boolean;
};

function revokeBlobUrl(url: string | null) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Self-contained photo picker. The selected File lives in a ref so the parent
 * lead form does not re-render when a photo is chosen (prevents UI freeze).
 */
export const StudentPhotoUploadField = React.forwardRef<StudentPhotoUploadRef, Props>(
  function StudentPhotoUploadField({ existingPhotoUrl, apiError, isEdit = false }, ref) {
    const fileRef = React.useRef<File | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const previewBlobRef = React.useRef<string | null>(null);
    const photoRemovedRef = React.useRef(false);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(existingPhotoUrl);
    const [localError, setLocalError] = React.useState<string | null>(null);
    const [hasSelection, setHasSelection] = React.useState(false);
    const [lightboxOpen, setLightboxOpen] = React.useState(false);

    const resetPreview = React.useCallback(() => {
      if (previewBlobRef.current) {
        revokeBlobUrl(previewBlobRef.current);
        previewBlobRef.current = null;
      }
      fileRef.current = null;
      photoRemovedRef.current = false;
      setLocalError(null);
      setHasSelection(false);
      setPreviewUrl(existingPhotoUrl);
      if (inputRef.current) inputRef.current.value = "";
      setLightboxOpen(false);
    }, [existingPhotoUrl]);

    const removePhoto = React.useCallback(() => {
      if (previewBlobRef.current) {
        revokeBlobUrl(previewBlobRef.current);
        previewBlobRef.current = null;
      }
      fileRef.current = null;
      photoRemovedRef.current = true;
      setLocalError(null);
      setHasSelection(false);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
      setLightboxOpen(false);
    }, []);

    React.useImperativeHandle(
      ref,
      () => ({
        getFile: () => fileRef.current,
        clear: resetPreview,
        isPhotoRemoved: () => photoRemovedRef.current,
      }),
      [resetPreview],
    );

    React.useEffect(() => {
      if (!fileRef.current) {
        if (previewBlobRef.current) {
          revokeBlobUrl(previewBlobRef.current);
          previewBlobRef.current = null;
        }
        setPreviewUrl(existingPhotoUrl);
      }
    }, [existingPhotoUrl]);

    React.useEffect(
      () => () => {
        if (previewBlobRef.current) {
          revokeBlobUrl(previewBlobRef.current);
        }
      },
      [],
    );

    React.useEffect(() => {
      if (!lightboxOpen) return;
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape") setLightboxOpen(false);
      }
      document.addEventListener("keydown", onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = prev;
      };
    }, [lightboxOpen]);

    function handlePick(file: File) {
      const validationError = validateStudentPhotoFile(file);
      if (validationError) {
        fileRef.current = null;
        setHasSelection(false);
        setLocalError(validationError);
        setPreviewUrl(existingPhotoUrl);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      if (previewBlobRef.current) {
        revokeBlobUrl(previewBlobRef.current);
        previewBlobRef.current = null;
      }

      fileRef.current = file;
      photoRemovedRef.current = false;
      setHasSelection(true);
      setLocalError(null);

      try {
        const objectUrl = URL.createObjectURL(file);
        previewBlobRef.current = objectUrl;
        setPreviewUrl(objectUrl);
      } catch {
        fileRef.current = null;
        setHasSelection(false);
        setLocalError("Could not preview photo. Try a different JPG or PNG file.");
        setPreviewUrl(existingPhotoUrl);
      }
    }

    const displayError = apiError ?? localError;

    return (
      <div>
        <p className="text-sm font-medium text-[var(--foreground)]">Student photo</p>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          Optional — JPG, JPEG, or PNG, max 2 MB
          {isEdit && existingPhotoUrl && !hasSelection ? " · Upload only to replace the current photo." : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-start gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]"
          >
            Choose photo
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              handlePick(file);
            }}
          />
          <div className="relative h-24 w-24 shrink-0">
            {previewUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="block h-24 w-24 overflow-hidden rounded-lg border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                  aria-label="View full-size photo preview"
                  title="Click to preview"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Student photo preview" className="h-full w-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto();
                  }}
                  className="absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-red-600 text-white shadow-md transition hover:bg-red-700"
                  aria-label="Remove photo"
                  title="Remove photo"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed text-xs text-[var(--foreground-muted)]">
                Preview
              </div>
            )}
          </div>
        </div>
        {displayError ? <p className="mt-1 text-xs text-red-600">{displayError}</p> : null}

        {lightboxOpen && previewUrl ? (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Student photo preview"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
              aria-label="Close preview"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Student photo full preview"
              className="max-h-[min(90vh,900px)] max-w-[min(90vw,900px)] rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : null}
      </div>
    );
  },
);
