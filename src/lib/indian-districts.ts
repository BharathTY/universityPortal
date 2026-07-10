import indianStateDistricts from "@/lib/data/indian-state-districts.json";
import { INDIAN_STATES_AND_UT } from "@/lib/indian-states";

type DistrictRegion = { name: string; districts: string[] };

const REGIONS: DistrictRegion[] = [
  ...(indianStateDistricts.states as DistrictRegion[]),
  ...(indianStateDistricts.union_territories as DistrictRegion[]),
];

const DISTRICTS_BY_STATE = new Map(
  REGIONS.map((region) => [region.name.toLowerCase(), [...region.districts].sort((a, b) => a.localeCompare(b))]),
);

const KNOWN_STATES = new Set(INDIAN_STATES_AND_UT.map((s) => s.value.toLowerCase()));

/** Districts for a state / UT name (case-insensitive). Empty when unknown or unset. */
export function getDistrictsForState(stateName: string): string[] {
  const key = stateName.trim().toLowerCase();
  if (!key) return [];
  return DISTRICTS_BY_STATE.get(key) ?? [];
}

export function isKnownIndianState(stateName: string): boolean {
  return KNOWN_STATES.has(stateName.trim().toLowerCase());
}

/** True when district is in the selected state's district list. */
export function isDistrictInState(stateName: string, districtName: string): boolean {
  const district = districtName.trim().toLowerCase();
  if (!district) return false;
  return getDistrictsForState(stateName).some((d) => d.toLowerCase() === district);
}
