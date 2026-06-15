import { normalizeIndianState } from "@/lib/indian-states";
import { validateUniversityPincode } from "@/lib/university-pincode";

/** Normalized university details returned to the onboarding UI. */
export type UniversityDetailsPayload = {
  universityName: string;
  location: string;
  state: string;
  district: string;
  city: string;
  area: string;
  pincode: string;
  contactNumber: string;
  email: string;
  logoUrl: string | null;
  website: string | null;
  universityType: string | null;
  /** Whether values came from the external API or the local master catalog fallback. */
  source: "external" | "catalog";
};

export type MasterCatalogRecord = {
  id: string;
  externalId: string;
  name: string;
  state: string;
  district: string;
  address: string | null;
  city: string | null;
  pincode: string | null;
  website: string | null;
  universityType: string;
};

function pickString(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

function pickNullableString(raw: Record<string, unknown>, keys: string[]): string | null {
  const v = pickString(raw, keys);
  return v || null;
}

/** Map an arbitrary external API JSON body into our normalized shape. */
export function normalizeExternalUniversityDetails(
  raw: unknown,
  fallback: MasterCatalogRecord,
): UniversityDetailsPayload {
  const body =
    raw && typeof raw === "object"
      ? ((raw as Record<string, unknown>).data ?? raw) as Record<string, unknown>
      : {};

  const universityName = pickString(body, [
    "universityName",
    "name",
    "university_name",
  ]) || fallback.name;

  const location =
    pickString(body, [
      "location",
      "universityLocation",
      "university_location",
      "address",
    ]) ||
    fallback.address?.trim() ||
    "";

  const state = normalizeIndianState(
    pickString(body, ["state", "stateName", "state_name"]) || fallback.state,
  );
  const district =
    pickString(body, ["district", "districtName", "district_name"]) || fallback.district;
  const city =
    pickString(body, ["city", "cityName", "city_name"]) ||
    fallback.city?.trim() ||
    fallback.district;
  const area =
    pickString(body, ["area", "locality", "areaName", "area_name"]) || city;
  const pincode =
    pickString(body, ["pincode", "pinCode", "pin_code", "postalCode"]) ||
    fallback.pincode?.trim() ||
    "";

  const contactNumber = pickString(body, [
    "contactNumber",
    "contact_number",
    "phone",
    "mobile",
    "universityContactNumber",
  ]);
  const email = pickString(body, ["email", "universityEmail", "university_email"]);
  const logoUrl = pickNullableString(body, ["logoUrl", "logo_url", "logo", "universityLogo"]);

  const website =
    pickNullableString(body, ["website", "webSite", "url"]) ?? fallback.website?.trim() ?? null;

  const universityType =
    pickNullableString(body, ["universityType", "university_type", "type"]) ??
    fallback.universityType ??
    null;

  return {
    universityName,
    location,
    state,
    district,
    city,
    area,
    pincode,
    contactNumber,
    email,
    logoUrl,
    website,
    universityType,
    source: "external",
  };
}

/** Build details from the local master catalog when the external API is unavailable. */
export function universityDetailsFromCatalog(fallback: MasterCatalogRecord): UniversityDetailsPayload {
  return {
    universityName: fallback.name,
    location: fallback.address?.trim() ?? "",
    state: normalizeIndianState(fallback.state),
    district: fallback.district,
    city: fallback.city?.trim() ?? fallback.district,
    area: fallback.city?.trim() ?? fallback.district,
    pincode: fallback.pincode?.trim() ?? "",
    contactNumber: "",
    email: "",
    logoUrl: null,
    website: fallback.website?.trim() ?? null,
    universityType: fallback.universityType,
    source: "catalog",
  };
}

function buildExternalApiUrl(externalId: string): string | null {
  const template = process.env.UNIVERSITY_DETAILS_API_URL?.trim();
  if (!template) return null;
  if (template.includes("{id}")) {
    return template.replace(/\{id\}/g, encodeURIComponent(externalId));
  }
  const base = template.replace(/\/$/, "");
  return `${base}/${encodeURIComponent(externalId)}`;
}

/**
 * Fetch university details from the configured external API.
 * Returns null when no API URL is configured or the request fails.
 */
export async function fetchExternalUniversityDetails(
  externalId: string,
): Promise<Record<string, unknown> | null> {
  const url = buildExternalApiUrl(externalId);
  if (!url) return null;

  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = process.env.UNIVERSITY_DETAILS_API_KEY?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const timeoutMs = Number(process.env.UNIVERSITY_DETAILS_API_TIMEOUT_MS ?? 8000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as unknown;
    if (!data || typeof data !== "object") return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve details: external API first, then master catalog fallback. */
export async function resolveUniversityDetails(
  master: MasterCatalogRecord,
): Promise<UniversityDetailsPayload> {
  const external = await fetchExternalUniversityDetails(master.externalId);
  if (external) {
    return normalizeExternalUniversityDetails(external, master);
  }
  return universityDetailsFromCatalog(master);
}

export function validateUniversityDetailsPayload(
  details: UniversityDetailsPayload,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!details.universityName.trim()) errors.universityName = "University name is required";
  if (!details.location.trim()) errors.location = "University location is required";
  if (!details.state.trim()) errors.state = "State is required";
  if (!details.district.trim()) errors.district = "District is required";
  if (!details.city.trim()) errors.city = "City is required";
  if (!details.area.trim()) errors.area = "Area is required";
  const pincodeError = validateUniversityPincode(details.pincode);
  if (pincodeError) errors.pincode = pincodeError;
  return errors;
}
