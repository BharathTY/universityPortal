"use client";

import * as React from "react";
import { validateStudentPhotoFile } from "@/lib/student-photo";

type Props = {
  existingPhotoUrl: string | null;
  selectedFile: File | null;
  error?: string;
  isEdit?: boolean;
  onFileChange: (file: File | null) => void;
  onError: (message: string | null) => void;
};

/**
 * Isolated photo picker + preview. Uses blob URLs (not base64) so the parent
 * form does not re-render with multi-megabyte strings in state.
 */
export function StudentPhotoUploadField({
  existingPhotoUrl,
  selectedFile,
  error,
  isEdit = false,
  onFileChange,
  onError,
}: Props) {
  const blobUrlRef = React.useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(existingPhotoUrl);

  function revokeBlob() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }

  React.useEffect(() => {
    return () => revokeBlob();
  }, []);

  React.useEffect(() => {
    if (selectedFile) return;
    revokeBlob();
    setPreviewUrl(existingPhotoUrl);
  }, [existingPhotoUrl, selectedFile]);

  function handlePick(file: File | null) {
    revokeBlob();

    if (!file) {
      onError(null);
      onFileChange(null);
      setPreviewUrl(existingPhotoUrl);
      return;
    }

    const validationError = validateStudentPhotoFile(file);
    if (validationError) {
      onError(validationError);
      onFileChange(null);
      setPreviewUrl(existingPhotoUrl);
      return;
    }

    onError(null);
    onFileChange(file);
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setPreviewUrl(url);
  }

  return (
    <div>
      <label className="text-sm font-medium text-[var(--foreground)]">Student photo</label>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">
        Optional — JPG, JPEG, or PNG, max 2 MB
        {isEdit && existingPhotoUrl && !selectedFile ? " · Upload only to replace the current photo." : ""}
      </p>
      <div className="mt-2 flex flex-wrap items-start gap-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]">
          Choose photo
          <input
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="sr-only"
            onChange={(e) => {
              handlePick(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </label>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Preview" className="h-24 w-24 rounded-lg border object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed text-xs text-[var(--foreground-muted)]">
            Preview
          </div>
        )}
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
