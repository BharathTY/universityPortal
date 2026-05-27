/**
 * Import master university catalog from docs/uni.csv (export of uni.xls).
 * Writes prisma/data/master-universities.json for db seed.
 *
 * Usage: npx tsx scripts/import-universities-from-csv.ts
 *        npx tsx scripts/import-universities-from-csv.ts path/to/uni.csv
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

type MasterUniRecord = {
  externalId: string;
  name: string;
  shortname?: string;
  state: string;
  stateCode?: string;
  district: string;
  address?: string;
  city?: string;
  pincode?: string;
  website?: string;
  universityType: "PRIVATE" | "DEEMED" | "STATE_GOVT";
  priority?: boolean;
};

type UniDetails = {
  state?: { name?: string; details?: { state_code?: string } };
  district?: { name?: string };
  address?: string;
  website?: string;
  shortname?: string;
  comment?: string;
  university_type?: string;
};

/** Parse one CSV row with quoted fields (handles doubled quotes). */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      fields.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  fields.push(current);
  return fields;
}

function titleCaseName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => (w.length <= 3 && /^[a-z]+$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function mapUniversityType(raw: string | undefined): MasterUniRecord["universityType"] {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("deemed")) return "DEEMED";
  if (s.includes("state") || s.includes("central")) return "STATE_GOVT";
  return "PRIVATE";
}

function normalizeWebsite(raw: string | undefined): string | undefined {
  const w = raw?.trim();
  if (!w) return undefined;
  if (/^https?:\/\//i.test(w)) return w;
  return `https://${w.replace(/^\/\//, "")}`;
}

function parseDetails(jsonRaw: string): UniDetails {
  try {
    return JSON.parse(jsonRaw) as UniDetails;
  } catch {
    return {};
  }
}

function importFromCsv(csvPath: string): MasterUniRecord[] {
  const text = readFileSync(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error(`CSV has no data rows: ${csvPath}`);
  }

  const header = parseCsvLine(lines[0]!);
  const idIdx = header.indexOf("id");
  const priorityIdx = header.indexOf("priority");
  const nameIdx = header.indexOf("name");
  const detailsIdx = header.indexOf("details");
  const disableIdx = header.indexOf("disable");

  if ([idIdx, nameIdx, detailsIdx].some((i) => i < 0)) {
    throw new Error(`Unexpected CSV columns: ${header.join(", ")}`);
  }

  const records: MasterUniRecord[] = [];
  const seenIds = new Set<string>();

  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li]!);
    const id = cols[idIdx]?.trim();
    const nameRaw = cols[nameIdx]?.trim();
    if (!id || !nameRaw) continue;

    const disabled = disableIdx >= 0 && cols[disableIdx]?.trim().toLowerCase() === "true";
    if (disabled) continue;

    const details = parseDetails(cols[detailsIdx] ?? "{}");
    const externalId = `MU-${id.padStart(5, "0")}`;
    if (seenIds.has(externalId)) continue;
    seenIds.add(externalId);

    const stateName = details.state?.name?.trim() || "Unknown";
    const districtName = details.district?.name?.trim() || stateName;
    const displayName = details.comment?.trim() || titleCaseName(nameRaw);

    records.push({
      externalId,
      name: displayName,
      shortname: details.shortname?.trim() || undefined,
      state: titleCaseName(stateName),
      stateCode: details.state?.details?.state_code?.trim() || undefined,
      district: titleCaseName(districtName),
      address: details.address?.trim() || undefined,
      city: titleCaseName(districtName),
      website: normalizeWebsite(details.website),
      universityType: mapUniversityType(details.university_type),
      priority: priorityIdx >= 0 ? cols[priorityIdx]?.trim().toLowerCase() === "true" : false,
    });
  }

  return records;
}

function main() {
  const defaultCsv = path.join(process.cwd(), "docs", "uni.csv");
  const xlsPath = path.join(process.cwd(), "docs", "uni.xls");
  const csvPath = process.argv[2] ?? defaultCsv;

  if (!existsSync(csvPath)) {
    if (existsSync(xlsPath)) {
      console.error(`Found ${xlsPath} but .xls parsing is not built in.`);
      console.error("Export uni.xls to docs/uni.csv (UTF-8) and re-run this script.");
      process.exit(1);
    }
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const records = importFromCsv(csvPath);
  records.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  const outDir = path.join(process.cwd(), "prisma", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "master-universities.json");
  writeFileSync(outPath, JSON.stringify(records));

  const byType = records.reduce(
    (acc, r) => {
      acc[r.universityType] = (acc[r.universityType] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(`Imported ${records.length} universities from ${csvPath}`);
  console.log(`Wrote ${outPath}`);
  console.log("By type:", byType);
  console.log("\nSample (first 5):");
  for (const r of records.slice(0, 5)) {
    console.log(`  ${r.externalId} | ${r.name} | ${r.state} | ${r.universityType}`);
  }
}

main();
