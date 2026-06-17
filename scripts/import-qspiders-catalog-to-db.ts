/**
 * Import QSpiders CSV exports from docs/ into the database.
 *
 * Files:
 *   docs/qualifications.csv → CatalogQualificationType
 *   docs/degree.csv       → CatalogDegreeType
 *   docs/streams.csv      → CatalogStreamSpecialization
 *   docs/uni.csv          → MasterUniversity
 *
 * Usage: npm run import:qspiders-catalog
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient, type ProgramLevel } from "@prisma/client";
import { parseCsvLine, readCsvRows, slugCode, titleCaseName } from "./lib/qspiders-csv";

const prisma = new PrismaClient();
const docsDir = path.join(process.cwd(), "docs");

type UniDetails = {
  state?: { name?: string; details?: { state_code?: string } };
  district?: { name?: string };
  address?: string;
  website?: string;
  shortname?: string;
  comment?: string;
  university_type?: string;
};

function mapUniversityType(raw: string | undefined): "PRIVATE" | "DEEMED" | "STATE_GOVT" {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("deemed")) return "DEEMED";
  if (s.includes("state") || s.includes("central")) return "STATE_GOVT";
  return "PRIVATE";
}

function normalizeWebsite(raw: string | undefined): string | null {
  const w = raw?.trim();
  if (!w) return null;
  if (/^https?:\/\//i.test(w)) return w;
  return `https://${w.replace(/^\/\//, "")}`;
}

function mapQualtypeToProgramLevel(qualtype: string): ProgramLevel | null {
  const q = qualtype.trim().toLowerCase();
  if (q === "masters") return "PG";
  if (q === "degree" || q === "diploma" || q === "iti") return "UG";
  return null;
}

function parseDegreesJson(raw: string): { id: number; name?: string }[] {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed === "[]") return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const id = Number(row.id);
        if (!Number.isFinite(id)) return null;
        return { id, name: typeof row.name === "string" ? row.name : undefined };
      })
      .filter((x): x is { id: number; name?: string } => x !== null);
  } catch {
    return [];
  }
}

async function importQualifications(): Promise<number> {
  const csvPath = path.join(docsDir, "qualifications.csv");
  if (!existsSync(csvPath)) {
    console.log("  ⊘ qualifications.csv not found — skipped");
    return 0;
  }

  const { header, rows } = readCsvRows(csvPath);
  const idIdx = header.indexOf("id");
  const nameIdx = header.indexOf("name");
  const priorityIdx = header.indexOf("priority");

  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i]!;
    const id = cols[idIdx]?.trim();
    const label = cols[nameIdx]?.trim();
    if (!id || !label) continue;

    const externalId = id;
    const code = slugCode(label);
    const priority = priorityIdx >= 0 && cols[priorityIdx]?.trim().toLowerCase() === "true";

    await prisma.catalogQualificationType.upsert({
      where: { externalId },
      create: {
        externalId,
        code,
        label,
        active: true,
        sortOrder: priority ? 0 : i + 1,
      },
      update: { code, label, active: true, sortOrder: priority ? 0 : i + 1 },
    });
    count++;
  }
  return count;
}

async function importDegrees(): Promise<number> {
  const csvPath = path.join(docsDir, "degree.csv");
  if (!existsSync(csvPath)) {
    console.log("  ⊘ degree.csv not found — skipped");
    return 0;
  }

  const { header, rows } = readCsvRows(csvPath);
  const idIdx = header.indexOf("id");
  const nameIdx = header.indexOf("name");
  const shortIdx = header.indexOf("shortname");
  const qualIdx = header.indexOf("qualtype");

  const usedCodes = new Set<string>();
  let count = 0;

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i]!;
    const id = cols[idIdx]?.trim();
    const labelRaw = cols[nameIdx]?.trim();
    if (!id || !labelRaw) continue;

    const shortname = cols[shortIdx]?.trim() ?? "";
    const qualtype = cols[qualIdx]?.trim() ?? "";
    const label = titleCaseName(labelRaw);
    const externalId = id;

    let code = slugCode(shortname || labelRaw);
    if (usedCodes.has(code)) code = `${code}_${id}`;
    usedCodes.add(code);

    const programLevel = mapQualtypeToProgramLevel(qualtype);

    await prisma.catalogDegreeType.upsert({
      where: { externalId },
      create: {
        externalId,
        code,
        label,
        programLevel,
        active: true,
        sortOrder: i,
      },
      update: { code, label, programLevel, active: true, sortOrder: i },
    });
    count++;
  }
  return count;
}

async function importStreams(): Promise<number> {
  const csvPath = path.join(docsDir, "streams.csv");
  if (!existsSync(csvPath)) {
    console.log("  ⊘ streams.csv not found — skipped");
    return 0;
  }

  const { header, rows } = readCsvRows(csvPath);
  const idIdx = header.indexOf("id");
  const nameIdx = header.indexOf("name");
  const degreesIdx = header.indexOf("degrees");

  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i]!;
    const id = cols[idIdx]?.trim();
    const nameRaw = cols[nameIdx]?.trim();
    if (!id || !nameRaw) continue;

    const name = titleCaseName(nameRaw);
    const externalId = id;
    const degrees = degreesIdx >= 0 ? parseDegreesJson(cols[degreesIdx] ?? "") : [];
    const degreeTypeExternalId = degrees[0] != null ? String(degrees[0].id) : null;
    const code = slugCode(nameRaw);

    await prisma.catalogStreamSpecialization.upsert({
      where: { externalId },
      create: {
        externalId,
        code,
        name,
        degreeTypeExternalId,
        active: true,
        sortOrder: i,
      },
      update: {
        code,
        name,
        degreeTypeExternalId,
        active: true,
        sortOrder: i,
      },
    });
    count++;
  }
  return count;
}

async function importUniversities(): Promise<number> {
  const csvPath = path.join(docsDir, "uni.csv");
  if (!existsSync(csvPath)) {
    console.log("  ⊘ uni.csv not found — skipped");
    return 0;
  }

  const text = readFileSync(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = parseCsvLine(lines[0]!);
  const idIdx = header.indexOf("id");
  const priorityIdx = header.indexOf("priority");
  const nameIdx = header.indexOf("name");
  const detailsIdx = header.indexOf("details");
  const disableIdx = header.indexOf("disable");

  let count = 0;
  const batchSize = 50;
  type UpsertArgs = Parameters<typeof prisma.masterUniversity.upsert>[0];
  const batch: UpsertArgs[] = [];

  async function flush() {
    if (batch.length === 0) return;
    await prisma.$transaction(batch.map((args) => prisma.masterUniversity.upsert(args)));
    count += batch.length;
    batch.length = 0;
    if (count % 200 === 0) console.log(`    … ${count} universities`);
  }

  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li]!);
    const id = cols[idIdx]?.trim();
    const nameRaw = cols[nameIdx]?.trim();
    if (!id || !nameRaw) continue;

    const disabled = disableIdx >= 0 && cols[disableIdx]?.trim().toLowerCase() === "true";
    if (disabled) continue;

    let details: UniDetails = {};
    try {
      details = JSON.parse(cols[detailsIdx] ?? "{}") as UniDetails;
    } catch {
      details = {};
    }

    const externalId = `MU-${id.padStart(5, "0")}`;
    const stateName = details.state?.name?.trim() || "Unknown";
    const districtName = details.district?.name?.trim() || stateName;
    const displayName = details.comment?.trim() || titleCaseName(nameRaw);
    const priority = priorityIdx >= 0 && cols[priorityIdx]?.trim().toLowerCase() === "true";

    const data = {
      externalId,
      name: displayName,
      shortname: details.shortname?.trim() || null,
      state: titleCaseName(stateName),
      stateCode: details.state?.details?.state_code?.trim() || null,
      district: titleCaseName(districtName),
      address: details.address?.trim() || null,
      city: titleCaseName(districtName),
      pincode: null as string | null,
      website: normalizeWebsite(details.website),
      universityType: mapUniversityType(details.university_type),
      priority,
    };

    batch.push({
      where: { externalId },
      create: data,
      update: {
        name: data.name,
        shortname: data.shortname,
        state: data.state,
        stateCode: data.stateCode,
        district: data.district,
        address: data.address,
        city: data.city,
        website: data.website,
        universityType: data.universityType,
        priority: data.priority,
      },
    });

    if (batch.length >= batchSize) await flush();
  }

  await flush();
  return count;
}

async function main() {
  console.log("Importing QSpiders catalog from docs/ …\n");

  const qualifications = await importQualifications();
  console.log(`✓ Qualifications: ${qualifications} rows → CatalogQualificationType`);

  const degrees = await importDegrees();
  console.log(`✓ Degrees: ${degrees} rows → CatalogDegreeType`);

  const streams = await importStreams();
  console.log(`✓ Streams: ${streams} rows → CatalogStreamSpecialization`);

  console.log("✓ Universities (this may take a minute)…");
  const universities = await importUniversities();
  console.log(`✓ Universities: ${universities} rows → MasterUniversity`);

  const [q, d, s, u] = await Promise.all([
    prisma.catalogQualificationType.count(),
    prisma.catalogDegreeType.count(),
    prisma.catalogStreamSpecialization.count(),
    prisma.masterUniversity.count(),
  ]);

  console.log("\n——");
  console.log(`Database totals: ${q} qualifications, ${d} degrees, ${s} streams, ${u} universities`);
  console.log("Program catalog API (/api/catalog/program) will now use database source.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
