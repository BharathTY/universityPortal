import { MouTenure } from "@prisma/client";
import { buildSelectableYopYears, isSelectableYopYear } from "@/lib/academic-year-yop";

export const MOU_PDF_MAX_BYTES = 10 * 1024 * 1024;
export const EVENT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const MOU_PDF_ACCEPT = ".pdf,application/pdf";
export const EVENT_PHOTO_ACCEPT = "image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png";

export const MOU_TENURE_OPTIONS: { value: MouTenure; label: string }[] = [
  { value: MouTenure.ONE_YEAR, label: "1 year" },
  { value: MouTenure.TWO_YEARS, label: "2 years" },
  { value: MouTenure.OTHER, label: "Other" },
];

export type MouDocumentDraft = {
  id: string;
  file: File;
};

export type MouDocumentsForm = {
  mouYear: string;
  mouTenure: MouTenure | "";
  mouFiles: MouDocumentDraft[];
  eventPhotos: File[];
};

export function createMouDocumentDraft(file: File): MouDocumentDraft {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `mou-${Date.now()}-${Math.random()}`,
    file,
  };
}

export function buildMouYearOptions(now = new Date()): string[] {
  return buildSelectableYopYears(now).map(String);
}

export function isPdfFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

export function isEventPhotoFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (["image/jpeg", "image/jpg", "image/png"].includes(file.type)) return true;
  return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png");
}

export function validateMouPdfFile(file: File): string | null {
  if (!isPdfFile(file)) return "MOU must be a PDF file";
  if (file.size > MOU_PDF_MAX_BYTES) return "Each MOU document must be 10 MB or smaller";
  return null;
}

export function validateEventPhotoFile(file: File): string | null {
  if (!isEventPhotoFile(file)) return "Event photos must be JPG, JPEG, or PNG";
  if (file.size > EVENT_PHOTO_MAX_BYTES) return "Each event photo must be 5 MB or smaller";
  return null;
}

export function validateMouDocuments(
  form: MouDocumentsForm,
  options?: { existingMouCount?: number },
): Record<string, string> {
  const errors: Record<string, string> = {};
  const existingMouCount = options?.existingMouCount ?? 0;

  const year = form.mouYear.trim();
  if (!year) {
    errors.mouYear = "MOU year is required";
  } else {
    const yearNum = Number(year);
    if (!Number.isInteger(yearNum) || !isSelectableYopYear(yearNum)) {
      errors.mouYear = "Select a valid MOU year";
    }
  }

  if (!form.mouTenure) {
    errors.mouTenure = "MOU tenure is required";
  }

  if (form.mouFiles.length === 0 && existingMouCount === 0) {
    errors.mouFiles = "Upload at least one MOU document";
  } else {
    for (const draft of form.mouFiles) {
      const fileError = validateMouPdfFile(draft.file);
      if (fileError) {
        errors.mouFiles = fileError;
        break;
      }
    }
  }

  for (const photo of form.eventPhotos) {
    const photoError = validateEventPhotoFile(photo);
    if (photoError) {
      errors.eventPhotos = photoError;
      break;
    }
  }

  return errors;
}
