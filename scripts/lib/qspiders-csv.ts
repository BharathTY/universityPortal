/**
 * Shared CSV line parser for QSpiders exports (quoted fields, doubled quotes).
 */
export function parseCsvLine(line: string): string[] {
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

import { readFileSync } from "node:fs";

export function readCsvRows(csvPath: string): { header: string[]; rows: string[][] } {
  const text = readFileSync(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error(`CSV has no data rows: ${csvPath}`);
  }
  const header = parseCsvLine(lines[0]!);
  const rows = lines.slice(1).map((line) => parseCsvLine(line));
  return { header, rows };
}

export function slugCode(raw: string, maxLen = 64): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLen);
  return s || "item";
}

export function titleCaseName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => (w.length <= 3 && /^[a-z]+$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}
