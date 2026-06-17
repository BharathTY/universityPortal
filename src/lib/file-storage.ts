import { mkdir, writeFile } from "node:fs/promises";

import path from "node:path";

import { randomBytes } from "node:crypto";



const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;



const DEFAULT_ALLOWED_MIME: Record<string, string[]> = {

  mou: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],

  image: ["image/jpeg", "image/png", "image/jpg"],

};



export type StoreUploadOptions = {

  maxBytes?: number;

  allowedMime?: string[];

};



export function validateUploadSize(size: number, maxBytes = DEFAULT_MAX_BYTES): void {

  if (size > maxBytes) {

    const limitMb = (maxBytes / (1024 * 1024)).toFixed(0);

    throw new Error(`File exceeds ${limitMb} MB limit`);

  }

}



export function validateMime(kind: "mou" | "image", mime: string, allowedMime?: string[]): void {

  const allowed = allowedMime ?? DEFAULT_ALLOWED_MIME[kind];

  if (!allowed.includes(mime)) {

    throw new Error(`File type not allowed: ${mime}`);

  }

}



/** Store file locally under public/uploads; returns public URL path. */

export async function storeUpload(

  file: File,

  subdir: string,

  kind: "mou" | "image",

  options?: StoreUploadOptions,

): Promise<{ fileName: string; fileUrl: string }> {

  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;

  validateUploadSize(file.size, maxBytes);



  const mime = file.type || "application/octet-stream";

  const allowedMime = options?.allowedMime ?? DEFAULT_ALLOWED_MIME[kind];

  if (mime !== "application/octet-stream") {

    validateMime(kind, mime, allowedMime);

  } else {

    const ext = path.extname(file.name).toLowerCase();

    const extAllowed =

      kind === "mou"

        ? ext === ".pdf" || ext === ".doc" || ext === ".docx"

        : ext === ".jpg" || ext === ".jpeg" || ext === ".png";

    if (!extAllowed) {

      throw new Error(`File type not allowed: ${file.name}`);

    }

  }



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

