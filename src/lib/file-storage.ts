import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME: Record<string, string[]> = {
  mou: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  image: ["image/jpeg", "image/png", "image/jpg"],
};

export function validateUploadSize(size: number): void {
  if (size > MAX_BYTES) {
    throw new Error("File exceeds 2MB limit");
  }
}

export function validateMime(kind: "mou" | "image", mime: string): void {
  const allowed = ALLOWED_MIME[kind];
  if (!allowed.includes(mime)) {
    throw new Error(`File type not allowed: ${mime}`);
  }
}

/** Store file locally under public/uploads; returns public URL path. */
export async function storeUpload(
  file: File,
  subdir: string,
  kind: "mou" | "image",
): Promise<{ fileName: string; fileUrl: string }> {
  validateUploadSize(file.size);
  validateMime(kind, file.type || "application/octet-stream");

  const ext = path.extname(file.name) || (kind === "mou" ? ".pdf" : ".jpg");
  const safeName = `${randomBytes(8).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, safeName), buffer);
  return {
    fileName: file.name,
    fileUrl: `/uploads/${subdir}/${safeName}`,
  };
}
