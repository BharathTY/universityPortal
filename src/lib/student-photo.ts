export const STUDENT_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export function validateStudentPhotoFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const typeOk =
    ["image/jpeg", "image/jpg", "image/png"].includes(file.type) ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png");
  if (!typeOk) return "Photo must be JPG, JPEG, or PNG";
  if (file.size > STUDENT_PHOTO_MAX_BYTES) return "Photo must be 2 MB or smaller";
  return null;
}

export function readStudentPhotoPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read photo"));
    };
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.readAsDataURL(file);
  });
}
