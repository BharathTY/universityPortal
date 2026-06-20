"use client";

import * as React from "react";
import { createStudentPhotoThumbnail, validateStudentPhotoFile } from "@/lib/student-photo";

export type StudentPhotoUploadRef = {
  getFile: () => File | null;
  clear: () => void;
};

type Props = {
  existingPhotoUrl: string | null;
  apiError?: string;
  isEdit?: boolean;
};

/**
 * Self-contained photo picker. The selected File lives in a ref so the parent
 * lead form does not re-render when a photo is chosen (prevents UI freeze).
 */
export const StudentPhotoUploadField = React.forwardRef<StudentPhotoUploadRef, Props>(
  function StudentPhotoUploadField({ existingPhotoUrl, apiError, isEdit = false }, ref) {
    const fileRef = React.useRef<File | null>(null);
    const pickIdRef = React.useRef(0);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(existingPhotoUrl);
    const [localError, setLocalError] = React.useState<string | null>(null);
    const [hasSelection, setHasSelection] = React.useState(false);

    const resetPreview = React.useCallback(() => {
      fileRef.current = null;
      setLocalError(null);
      setBusy(false);
      setHasSelection(false);
      setPreviewUrl(existingPhotoUrl);
    }, [existingPhotoUrl]);

    React.useImperativeHandle(
      ref,
      () => ({
        getFile: () => fileRef.current,
        clear: resetPreview,
      }),
      [resetPreview],
    );

    React.useEffect(() => {
      if (!fileRef.current) {
        setPreviewUrl(existingPhotoUrl);
      }
    }, [existingPhotoUrl]);

    async function handlePick(file: File | null) {
      const pickId = ++pickIdRef.current;

      if (!file) {
        resetPreview();
        return;
      }

      const validationError = validateStudentPhotoFile(file);
      if (validationError) {
        fileRef.current = null;
        setHasSelection(false);
        setLocalError(validationError);
        setPreviewUrl(existingPhotoUrl);
        setBusy(false);
        return;
      }

      fileRef.current = file;
      setHasSelection(true);
      setLocalError(null);
      setBusy(true);

      try {
        const thumb = await createStudentPhotoThumbnail(file);
        if (pickId !== pickIdRef.current) return;
        setPreviewUrl(thumb);
      } catch {
        if (pickId !== pickIdRef.current) return;
        fileRef.current = null;
        setHasSelection(false);
        setLocalError("Could not preview photo. Try a different JPG or PNG file.");
        setPreviewUrl(existingPhotoUrl);
      } finally {
        if (pickId === pickIdRef.current) setBusy(false);
      }
    }

    const displayError = apiError ?? localError;

    return (
      <div>
        <label className="text-sm font-medium text-[var(--foreground)]">Student photo</label>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          Optional — JPG, JPEG, or PNG, max 2 MB
          {isEdit && existingPhotoUrl && !hasSelection ? " · Upload only to replace the current photo." : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-start gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]">
            {busy ? "Processing…" : "Choose photo"}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void handlePick(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
          <div className="relative h-24 w-24 shrink-0">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview" className="h-24 w-24 rounded-lg border object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed text-xs text-[var(--foreground-muted)]">
                Preview
              </div>
            )}
            {busy ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/35 text-xs font-medium text-white">
                …
              </div>
            ) : null}
          </div>
        </div>
        {displayError ? <p className="mt-1 text-xs text-red-600">{displayError}</p> : null}
      </div>
    );
  },
);
