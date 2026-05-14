import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireMasterApi } from "@/lib/master-session";

/** Maximum 2 MB (matches product error copy). */
const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
]);

const TYPE_ERROR = "Only PNG, JPG, JPEG, SVG, or WEBP files are allowed";
const SIZE_ERROR = "File size should not exceed 2 MB";

export async function POST(req: Request) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: SIZE_ERROR }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  const ext = ALLOWED.get(mime);
  if (!ext) {
    return NextResponse.json({ error: TYPE_ERROR }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const filename = `${randomBytes(16).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "universities");
  const absFile = path.join(dir, filename);

  await mkdir(dir, { recursive: true });
  await writeFile(absFile, buf);

  const urlPath = `/uploads/universities/${filename}`;
  return NextResponse.json({ url: urlPath });
}
