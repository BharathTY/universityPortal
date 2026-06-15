/** Maximum university logo upload size (2 MB). */
export const UNIVERSITY_LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const UNIVERSITY_LOGO_ACCEPT = "image/png,image/jpeg,image/jpg";

export const UNIVERSITY_LOGO_ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

export const UNIVERSITY_LOGO_TYPE_ERROR = "Only JPG, JPEG, or PNG files are allowed";
export const UNIVERSITY_LOGO_SIZE_ERROR = "Maximum file size is 2 MB";

/** Map MIME type to file extension for stored uploads. */
export const UNIVERSITY_LOGO_MIME_TO_EXT = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
]);

/** Returns an error message, or null when valid. */
export function validateUniversityLogoFile(file: File): string | null {
  const mime = file.type || "";
  if (!UNIVERSITY_LOGO_ALLOWED_MIME.has(mime)) return UNIVERSITY_LOGO_TYPE_ERROR;
  if (file.size > UNIVERSITY_LOGO_MAX_BYTES) return UNIVERSITY_LOGO_SIZE_ERROR;
  return null;
}
