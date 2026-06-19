import { HostelGender, HostelRoomType, HostelSharing, MouTenure, ProgramLevel, ScholarshipType } from "@prisma/client";
import { comboForSelection, HOSTEL_FEE_COMBOS, type HostelFeeDbRow } from "@/lib/hostel-fee-matrix";
import { newClientId } from "@/lib/client-id";
import { createEmptyStreamEntry, type StreamEntry } from "@/lib/stream-entry-payload";
import { createEmptyScholarshipEntry, type ScholarshipEntry } from "@/lib/university-scholarship";
import {
  createEmptyUniversityMouSpocDraft,
  type UniversityMouSpocDraft,
} from "@/lib/university-mou-spoc";
import { createEmptyUniversitySpocDraft, type UniversitySpocDraft } from "@/lib/university-spoc";
import {
  createHostelDetailsEntry,
  type HostelAcChoice,
  type HostelDetailsEntry,
  type HostelDetailsState,
  type HostelSharingChoice,
  type HostelTypeChoice,
} from "@/lib/university-hostel-details";

export type UniversityEditWizardData = {
  universityId: string;
  code: string;
  name: string;
  masterUniversityId: string | null;
  location: string;
  state: string;
  district: string;
  city: string;
  area: string;
  pincode: string;
  website: string;
  universityType: string;
  email: string;
  phone: string;
  logoUrl: string;
  spocRows: UniversitySpocDraft[];
  streamEntries: StreamEntry[];
  targetStudentsUg: string;
  targetStudentsPg: string;
  hostelDetails: HostelDetailsState;
  scholarshipEntries: ScholarshipEntry[];
  mouSpocRows: UniversityMouSpocDraft[];
  mouYear: string;
  mouTenure: MouTenure | "";
  existingMouCount: number;
  existingMouDocuments: { fileName: string; fileUrl: string }[];
  existingEventPhotos: { fileName: string; fileUrl: string }[];
};

function sharingEnumToChoice(sharing: HostelSharing): HostelSharingChoice {
  switch (sharing) {
    case HostelSharing.SINGLE:
      return "1";
    case HostelSharing.TWO_SHARING:
      return "2";
    case HostelSharing.TRIPLE:
      return "3";
    case HostelSharing.FOUR_SHARING:
      return "4";
    default:
      return "";
  }
}

function genderEnumToType(gender: HostelGender): HostelTypeChoice {
  if (gender === HostelGender.BOYS) return "BOYS";
  if (gender === HostelGender.GIRLS) return "GIRLS";
  return "";
}

function acEnumToChoice(roomType: HostelRoomType): HostelAcChoice {
  if (roomType === HostelRoomType.AC) return "AC";
  if (roomType === HostelRoomType.NON_AC) return "NON_AC";
  return "";
}

function decimalToString(value: { toString(): string } | null | undefined): string {
  if (value == null) return "";
  return value.toString();
}

export function hostelDbRowsToDetailsState(
  rows: HostelFeeDbRow[],
  foodFee: string | null,
): HostelDetailsState {
  const entries: HostelDetailsEntry[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const amount = decimalToString(row.amount as { toString(): string } | null);
    if (!amount || Number(amount) <= 0) continue;

    const combo = comboForSelection({
      gender: row.gender,
      roomType: row.roomType,
      sharing: row.sharing,
    });
    if (!combo) continue;

    const key = `${combo.genderLabel}|${combo.roomLabel}|${combo.sharingLabel}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const hostelType = genderEnumToType(row.gender);
    const acType = acEnumToChoice(row.roomType);
    const sharingType = sharingEnumToChoice(row.sharing);
    if (!hostelType || !acType || !sharingType) continue;

    entries.push(
      createHostelDetailsEntry({
        feePerYear: amount,
        hostelType,
        acType,
        sharingType,
        foodFee: foodFee ?? "",
      }),
    );
  }

  return {
    hostelAvailable: entries.length > 0 ? "YES" : "NO",
    entries,
  };
}

type StreamRow = {
  id: string;
  name: string;
  degreeType: string | null;
  programLevel: ProgramLevel | null;
  totalSeats: number | null;
  tuitionYear1: { toString(): string } | null;
  tuitionTotal: { toString(): string } | null;
  streamFee: { toString(): string } | null;
  applicationFee: { toString(): string } | null;
  examFee: { toString(): string } | null;
  otherAdminCharges: string | null;
  otherAdminAmount: { toString(): string } | null;
};

type CetRow = {
  programLevel: ProgramLevel | null;
  programName: string | null;
  streamName: string;
  allocationMode: string;
  allocationValue: { toString(): string } | null;
};

export function buildUniversityEditWizardData(input: {
  university: {
    id: string;
    code: string;
    name: string;
    masterUniversityId: string | null;
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
    messFee: { toString(): string } | null;
    mouYear: string | null;
    mouTenure: MouTenure | null;
    mouFileUrl: string | null;
    eventPhotoUrls: string[];
    targetStudents: number | null;
    spocs: { name: string; designation: string; mobile: string; email: string }[];
    mouSpocs: { name: string; designation: string; mobile: string; email: string }[];
    streams: StreamRow[];
    cetSeats: CetRow[];
    hostelFees: HostelFeeDbRow[];
    scholarships: { type: ScholarshipType; value: { toString(): string } }[];
    documents: { kind: string; fileName: string; fileUrl: string }[];
  };
}): UniversityEditWizardData {
  const u = input.university;

  const cetByStream = new Map<string, CetRow>();
  for (const seat of u.cetSeats) {
    const key = `${seat.programLevel ?? ""}|${seat.programName ?? ""}|${seat.streamName}`;
    cetByStream.set(key, seat);
  }

  const streamEntries: StreamEntry[] =
    u.streams.length > 0
      ? u.streams.map((stream) => {
          const key = `${stream.programLevel ?? ""}|${stream.degreeType ?? ""}|${stream.name}`;
          const cet = cetByStream.get(key);
          const entry = createEmptyStreamEntry((stream.programLevel ?? ProgramLevel.UG) as "UG" | "PG");
          entry.id = stream.id;
          entry.programName = stream.degreeType ?? "";
          entry.streamName = stream.name;
          entry.targetStudents = stream.totalSeats != null ? String(stream.totalSeats) : "";
          entry.tuitionYear1 = decimalToString(stream.tuitionYear1);
          entry.tuitionTotal = decimalToString(stream.tuitionTotal);
          entry.registrationFee = decimalToString(stream.streamFee);
          entry.applicationFee = decimalToString(stream.applicationFee);
          entry.examFee = decimalToString(stream.examFee);
          entry.otherAdminCharges = stream.otherAdminCharges ?? "";
          entry.otherAdminAmount = decimalToString(stream.otherAdminAmount);
          entry.hasOtherAdmin = Boolean(entry.otherAdminCharges.trim() || entry.otherAdminAmount.trim());
          if (cet) {
            entry.cetAllocationMode = cet.allocationMode === "PERCENT" ? "PERCENT" : "SEATS";
            entry.cetAllocationValue = decimalToString(cet.allocationValue);
          }
          return entry;
        })
      : [createEmptyStreamEntry()];

  let targetStudentsUg = "";
  let targetStudentsPg = "";
  for (const stream of u.streams) {
    if (stream.programLevel === ProgramLevel.UG && !targetStudentsUg) {
      targetStudentsUg = stream.totalSeats != null ? String(stream.totalSeats) : "";
    }
    if (stream.programLevel === ProgramLevel.PG && !targetStudentsPg) {
      targetStudentsPg = stream.totalSeats != null ? String(stream.totalSeats) : "";
    }
  }

  const spocRows: UniversitySpocDraft[] =
    u.spocs.length > 0
      ? u.spocs.map((spoc) => ({
          id: newClientId("uspoc"),
          name: spoc.name,
          designation: spoc.designation,
          mobile: spoc.mobile,
          email: spoc.email,
        }))
      : [createEmptyUniversitySpocDraft()];

  const mouSpocRows: UniversityMouSpocDraft[] =
    u.mouSpocs.length > 0
      ? u.mouSpocs.map((spoc) => ({
          id: newClientId("mouspoc"),
          name: spoc.name,
          designation: spoc.designation,
          mobile: spoc.mobile,
          email: spoc.email,
        }))
      : [createEmptyUniversityMouSpocDraft()];

  const scholarshipEntries: ScholarshipEntry[] =
    u.scholarships.length > 0
      ? u.scholarships.map((scholarship) => ({
          id: newClientId("sch"),
          type: scholarship.type,
          value: scholarship.value.toString(),
        }))
      : [createEmptyScholarshipEntry()];

  const mouDocuments = u.documents
    .filter((doc) => doc.kind === "MOU")
    .map((doc) => ({ fileName: doc.fileName, fileUrl: doc.fileUrl }));

  if (u.mouFileUrl && !mouDocuments.some((doc) => doc.fileUrl === u.mouFileUrl)) {
    mouDocuments.unshift({ fileName: "MOU document", fileUrl: u.mouFileUrl });
  }

  const eventPhotosFromDocs = u.documents
    .filter((doc) => doc.kind === "EVENT_PHOTO")
    .map((doc) => ({ fileName: doc.fileName, fileUrl: doc.fileUrl }));

  const existingEventPhotos = eventPhotosFromDocs.length
    ? eventPhotosFromDocs
    : u.eventPhotoUrls.map((url, index) => ({
        fileName: `Event photo ${index + 1}`,
        fileUrl: url,
      }));

  return {
    universityId: u.id,
    code: u.code,
    name: u.name,
    masterUniversityId: u.masterUniversityId,
    location: u.location ?? "",
    state: u.state ?? "",
    district: u.district ?? "",
    city: u.city ?? "",
    area: u.area ?? "",
    pincode: u.pincode ?? "",
    website: u.website ?? "",
    universityType: u.universityType ?? "",
    email: u.email ?? "",
    phone: u.phone ?? "",
    logoUrl: u.logoUrl ?? "",
    spocRows,
    streamEntries,
    targetStudentsUg,
    targetStudentsPg,
    hostelDetails: hostelDbRowsToDetailsState(u.hostelFees, decimalToString(u.messFee) || null),
    scholarshipEntries,
    mouSpocRows,
    mouYear: u.mouYear ?? "",
    mouTenure: (u.mouTenure ?? "") as MouTenure | "",
    existingMouCount: mouDocuments.length,
    existingMouDocuments: mouDocuments,
    existingEventPhotos,
  };
}
