import { HOSTEL_FEE_COMBOS } from "@/lib/hostel-fee-matrix";
import { MOU_TENURE_OPTIONS } from "@/lib/university-mou-documents";
import { SCHOLARSHIP_TYPE_LABELS } from "@/lib/university-scholarship";
import type { MouTenure, ScholarshipType } from "@prisma/client";

export type UniversityProfileView = {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
  details: {
    location: string | null;
    state: string | null;
    district: string | null;
    city: string | null;
    area: string | null;
    pincode: string | null;
    website: string | null;
    universityType: string | null;
    email: string | null;
    phone: string | null;
    logoUrl: string | null;
    targetStudents: number | null;
  };
  spocs: {
    name: string;
    designation: string;
    mobile: string;
    email: string;
  }[];
  programs: {
    programLevel: string | null;
    programName: string | null;
    streamName: string;
    targetStudents: number;
    tuitionYear1: string | null;
    tuitionTotal: string | null;
    registrationFee: string | null;
    applicationFee: string | null;
    examFee: string | null;
    otherAdminAmount: string | null;
    cetAllocationMode: string | null;
    cetAllocationValue: string | null;
  }[];
  hostel: {
    available: boolean;
    mouYear: string | null;
    mouTenure: string | null;
    foodFee: string | null;
    entries: {
      label: string;
      feePerYear: string;
    }[];
  };
  scholarships: {
    type: string;
    typeLabel: string;
    value: string;
  }[];
  mou: {
    year: string | null;
    tenure: string | null;
    documents: { fileName: string; fileUrl: string }[];
    eventPhotos: { fileName: string; fileUrl: string }[];
  };
  mouSpocs: {
    name: string;
    designation: string;
    mobile: string;
    email: string;
  }[];
  admissionsCount: number;
};

export function formatUniversityTypeLabel(raw: string | null | undefined): string {
  if (!raw) return "—";
  switch (raw) {
    case "PRIVATE":
      return "Private";
    case "DEEMED":
      return "Deemed";
    case "STATE_GOVT":
      return "State / Central Govt";
    default:
      return raw.replace(/_/g, " ");
  }
}

export function formatMouTenureLabel(raw: string | null | undefined): string {
  if (!raw) return "—";
  return MOU_TENURE_OPTIONS.find((option) => option.value === raw)?.label ?? raw.replace(/_/g, " ").toLowerCase();
}

export function formatMoney(value: string | null | undefined): string {
  if (!value) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function formatStatusLabel(status: string): string {
  return status === "ACTIVE" ? "Active" : "Inactive";
}

export function formatCetAllocation(mode: string | null | undefined, value: string | null | undefined): string {
  if (!mode || !value) return "—";
  if (mode === "PERCENT") return `${value}%`;
  return `${value} seats`;
}

export function hostelEntryLabel(gender: string, roomType: string, sharing: string): string {
  const combo = HOSTEL_FEE_COMBOS.find(
    (item) => item.gender === gender && item.roomType === roomType && item.sharing === sharing,
  );
  if (combo) {
    return `${combo.genderLabel} · ${combo.roomLabel} · ${combo.sharingLabel}`;
  }
  return `${gender} · ${roomType} · ${sharing}`;
}

export function scholarshipTypeLabel(type: string): string {
  return SCHOLARSHIP_TYPE_LABELS[type as ScholarshipType] ?? type.replace(/_/g, " ").toLowerCase();
}

export function mouTenureFromEnum(value: MouTenure | null): string | null {
  return value ?? null;
}
