export const STUDENT_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const THUMBNAIL_MAX_DIM = 240;

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

/** Small JPEG data URL for UI preview — avoids storing multi-MB strings in parent state. */
export function createStudentPhotoThumbnail(file: File, maxDim = THUMBNAIL_MAX_DIM): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not create preview"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        reject(new Error("Could not create preview"));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load photo"));
    };

    img.src = objectUrl;
  });
}
