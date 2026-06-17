import { prisma } from "@/lib/prisma";
import type { ProgramLevel } from "@prisma/client";

export type ProgramCatalogOption = {
  value: string;
  label: string;
  externalId?: string;
};

export type ProgramCatalogSnapshot = {
  source: "external" | "database" | "fallback";
  qualificationTypes: ProgramCatalogOption[];
  degreeTypesByQualification: Record<string, ProgramCatalogOption[]>;
  streamsByDegreeType: Record<string, ProgramCatalogOption[]>;
  defaultStreams: ProgramCatalogOption[];
};

export const FALLBACK_QUALIFICATION_TYPES: ProgramCatalogOption[] = [
  { value: "UG", label: "UG (Degree)", externalId: "ug" },
  { value: "PG", label: "PG (Masters)", externalId: "pg" },
];

const FALLBACK_DEGREE_TYPES: Record<ProgramLevel, ProgramCatalogOption[]> = {
  UG: [
    { value: "BE", label: "BE", externalId: "be" },
    { value: "B.Tech", label: "B.Tech", externalId: "btech" },
    { value: "BCA", label: "BCA", externalId: "bca" },
  ],
  PG: [
    { value: "M.Tech", label: "M.Tech", externalId: "mtech" },
    { value: "MCA", label: "MCA", externalId: "mca" },
    { value: "MBA", label: "MBA", externalId: "mba" },
  ],
};

export const FALLBACK_STREAM_OPTIONS: ProgramCatalogOption[] = [
  { value: "Computer Science", label: "Computer Science", externalId: "cs" },
  { value: "Information Science", label: "Information Science", externalId: "is" },
  { value: "Artificial Intelligence", label: "Artificial Intelligence", externalId: "ai" },
];

function pickOptions(raw: unknown): ProgramCatalogOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const value = String(row.value ?? row.code ?? row.id ?? row.externalId ?? "").trim();
      const label = String(row.label ?? row.name ?? value).trim();
      const externalId = String(row.externalId ?? row.external_id ?? row.id ?? value).trim();
      if (!value || !label) return null;
      return { value, label, externalId: externalId || value };
    })
    .filter((x): x is ProgramCatalogOption => x !== null);
}

/** Drop duplicate rows (same externalId/value) while preserving order. */
function dedupeStreamOptions(options: ProgramCatalogOption[]): ProgramCatalogOption[] {
  const seen = new Set<string>();
  const deduped: ProgramCatalogOption[] = [];
  for (const opt of options) {
    const id = opt.externalId?.trim() || opt.value.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    deduped.push(opt);
  }
  return deduped;
}

/** Ensure stream options have unique values and disambiguate duplicate labels in one list. */
export function normalizeStreamOptions(options: ProgramCatalogOption[]): ProgramCatalogOption[] {
  const labelCounts = new Map<string, number>();
  for (const opt of options) {
    labelCounts.set(opt.label, (labelCounts.get(opt.label) ?? 0) + 1);
  }

  const seenValues = new Set<string>();
  const labelIndex = new Map<string, number>();
  const normalized: ProgramCatalogOption[] = [];

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    let value = opt.externalId?.trim() || opt.value.trim();
    if (!value || seenValues.has(value)) {
      value = `${opt.externalId?.trim() || opt.value.trim() || "stream"}__${i}`;
    }
    seenValues.add(value);

    let label = opt.label;
    if ((labelCounts.get(opt.label) ?? 0) > 1) {
      const idx = (labelIndex.get(opt.label) ?? 0) + 1;
      labelIndex.set(opt.label, idx);
      if (idx > 1) label = `${opt.label} (${idx})`;
    }

    normalized.push({
      value,
      label,
      externalId: opt.externalId ?? value,
    });
  }

  return normalized;
}

function buildFallbackCatalog(): ProgramCatalogSnapshot {
  const degreeTypesByQualification: Record<string, ProgramCatalogOption[]> = {
    UG: [...FALLBACK_DEGREE_TYPES.UG],
    PG: [...FALLBACK_DEGREE_TYPES.PG],
  };
  const streamsByDegreeType: Record<string, ProgramCatalogOption[]> = {};
  for (const level of Object.values(FALLBACK_DEGREE_TYPES)) {
    for (const degree of level) {
      streamsByDegreeType[degree.value] = [...FALLBACK_STREAM_OPTIONS];
    }
  }
  return {
    source: "fallback",
    qualificationTypes: [...FALLBACK_QUALIFICATION_TYPES],
    degreeTypesByQualification,
    streamsByDegreeType,
    defaultStreams: [...FALLBACK_STREAM_OPTIONS],
  };
}

async function fetchExternalProgramCatalog(): Promise<ProgramCatalogSnapshot | null> {
  const url = process.env.QSPIDERS_PROGRAM_CATALOG_API_URL?.trim();
  if (!url) return null;

  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = process.env.QSPIDERS_PROGRAM_CATALOG_API_KEY?.trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const timeoutMs = Number(process.env.QSPIDERS_PROGRAM_CATALOG_API_TIMEOUT_MS ?? 8000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { headers, signal: controller.signal, cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!data) return null;

    const body = (data.data ?? data) as Record<string, unknown>;
    const qualificationTypes = pickOptions(body.qualificationTypes ?? body.qualification_types);
    if (qualificationTypes.length === 0) return null;

    const degreeTypesByQualification: Record<string, ProgramCatalogOption[]> = {};
    const rawDegrees =
      body.degreeTypesByQualification ??
      body.degree_types_by_qualification ??
      body.degreeTypes ??
      body.degree_types;
    if (rawDegrees && typeof rawDegrees === "object" && !Array.isArray(rawDegrees)) {
      for (const [key, value] of Object.entries(rawDegrees as Record<string, unknown>)) {
        degreeTypesByQualification[key.toUpperCase()] = pickOptions(value);
      }
    }

    const streamsByDegreeType: Record<string, ProgramCatalogOption[]> = {};
    const rawStreams =
      body.streamsByDegreeType ?? body.streams_by_degree_type ?? body.streams ?? body.specializations;
    if (rawStreams && typeof rawStreams === "object" && !Array.isArray(rawStreams)) {
      for (const [key, value] of Object.entries(rawStreams as Record<string, unknown>)) {
        streamsByDegreeType[key] = pickOptions(value);
      }
    }

    const defaultStreams = pickOptions(body.defaultStreams ?? body.default_streams);

    return {
      source: "external",
      qualificationTypes,
      degreeTypesByQualification,
      streamsByDegreeType,
      defaultStreams: defaultStreams.length > 0 ? defaultStreams : [...FALLBACK_STREAM_OPTIONS],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function buildDatabaseCatalog(): Promise<ProgramCatalogSnapshot | null> {
  try {
    const [degreeRows, streamRows] = await Promise.all([
      prisma.catalogDegreeType.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        select: { code: true, label: true, externalId: true, programLevel: true },
      }),
      prisma.catalogStreamSpecialization.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          code: true,
          name: true,
          externalId: true,
          degreeTypeExternalId: true,
        },
      }),
    ]);

    if (degreeRows.length === 0 && streamRows.length === 0) return null;

    const degreeTypesByQualification: Record<string, ProgramCatalogOption[]> = {
      UG: [],
      PG: [],
    };

    for (const row of degreeRows) {
      const option: ProgramCatalogOption = {
        value: row.code,
        label: row.label,
        externalId: row.externalId,
      };
      const level = row.programLevel ?? "UG";
      degreeTypesByQualification[level]?.push(option);
    }

    if (degreeTypesByQualification.UG!.length === 0 && degreeTypesByQualification.PG!.length === 0) {
      degreeTypesByQualification.UG = [...FALLBACK_DEGREE_TYPES.UG];
      degreeTypesByQualification.PG = [...FALLBACK_DEGREE_TYPES.PG];
    }

    const degreeCodeByExternalId = new Map(
      degreeRows.map((row) => [row.externalId, row.code] as const),
    );

    const streamsByDegreeType: Record<string, ProgramCatalogOption[]> = {};
    for (const row of streamRows) {
      const option: ProgramCatalogOption = {
        value: row.externalId,
        label: row.name,
        externalId: row.externalId,
      };
      const keys = new Set<string>();
      if (row.degreeTypeExternalId) keys.add(row.degreeTypeExternalId);
      const degreeCode = row.degreeTypeExternalId
        ? degreeCodeByExternalId.get(row.degreeTypeExternalId)
        : undefined;
      if (degreeCode) keys.add(degreeCode);
      if (keys.size === 0) keys.add("default");

      for (const key of keys) {
        if (!streamsByDegreeType[key]) streamsByDegreeType[key] = [];
        streamsByDegreeType[key].push(option);
      }
    }

    for (const key of Object.keys(streamsByDegreeType)) {
      streamsByDegreeType[key] = normalizeStreamOptions(streamsByDegreeType[key]!);
    }

    return {
      source: "database",
      qualificationTypes: [...FALLBACK_QUALIFICATION_TYPES],
      degreeTypesByQualification,
      streamsByDegreeType,
      defaultStreams: [...FALLBACK_STREAM_OPTIONS],
    };
  } catch {
    return null;
  }
}

/** Built-in catalog used until QSpiders API or webhook-synced DB is available. */
export function getFallbackProgramCatalog(): ProgramCatalogSnapshot {
  return buildFallbackCatalog();
}

/** Resolve full program catalog: QSpiders API → webhook-synced DB → built-in fallback. */
export async function resolveProgramCatalog(): Promise<ProgramCatalogSnapshot> {
  const external = await fetchExternalProgramCatalog();
  if (external) return external;

  const database = await buildDatabaseCatalog();
  if (database) return database;

  return buildFallbackCatalog();
}

export function degreeTypesForQualification(
  catalog: ProgramCatalogSnapshot,
  qualificationType: string,
): ProgramCatalogOption[] {
  const key = qualificationType.toUpperCase();
  return catalog.degreeTypesByQualification[key] ?? [];
}

export function streamsForDegreeType(
  catalog: ProgramCatalogSnapshot,
  qualificationType: string,
  degreeType: string,
): ProgramCatalogOption[] {
  if (!degreeType) return normalizeStreamOptions(catalog.defaultStreams);

  const degrees = degreeTypesForQualification(catalog, qualificationType);
  const match = degrees.find((d) => d.value === degreeType || d.externalId === degreeType);

  const candidates: ProgramCatalogOption[] = [];
  const byCode = catalog.streamsByDegreeType[degreeType];
  if (byCode?.length) candidates.push(...byCode);
  if (match?.externalId) {
    const byExternalId = catalog.streamsByDegreeType[match.externalId];
    if (byExternalId?.length) candidates.push(...byExternalId);
  }

  if (candidates.length > 0) {
    return normalizeStreamOptions(dedupeStreamOptions(candidates));
  }

  return normalizeStreamOptions(catalog.defaultStreams);
}

export function isValidDegreeForQualification(
  catalog: ProgramCatalogSnapshot,
  qualificationType: string,
  degreeType: string,
): boolean {
  if (!degreeType.trim()) return false;
  return degreeTypesForQualification(catalog, qualificationType).some((d) => d.value === degreeType);
}

export function isValidStreamForDegree(
  catalog: ProgramCatalogSnapshot,
  qualificationType: string,
  degreeType: string,
  streamName: string,
): boolean {
  if (!streamName.trim()) return false;
  return streamsForDegreeType(catalog, qualificationType, degreeType).some(
    (s) => s.value === streamName || s.label === streamName,
  );
}
