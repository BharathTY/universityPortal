import { HostelGender, HostelRoomType, HostelSharing } from "@prisma/client";
import {
  comboForSelection,
  emptyHostelFeesForm,
  HOSTEL_FEE_COMBOS,
  type HostelFeesForm,
} from "@/lib/hostel-fee-matrix";
import { newClientId } from "@/lib/client-id";

export type HostelAvailableChoice = "" | "YES" | "NO";
export type HostelTypeChoice = "" | "BOYS" | "GIRLS";
export type HostelAcChoice = "" | "AC" | "NON_AC";
export type HostelSharingChoice = "" | "1" | "2" | "3" | "4";

/** Single saved hostel fee row in the form-and-table UI. */
export type HostelDetailsEntry = {
  id: string;
  feePerYear: string;
  hostelType: Exclude<HostelTypeChoice, "">;
  acType: Exclude<HostelAcChoice, "">;
  sharingType: Exclude<HostelSharingChoice, "">;
  foodFee: string;
};

/** Draft fields for adding/editing one hostel row. */
export type HostelDetailsDraft = {
  feePerYear: string;
  hostelType: HostelTypeChoice;
  acType: HostelAcChoice;
  sharingType: HostelSharingChoice;
  foodFee: string;
};

/** Parent-level hostel section state (availability + saved rows). */
export type HostelDetailsState = {
  hostelAvailable: HostelAvailableChoice;
  entries: HostelDetailsEntry[];
};

/** @deprecated Use HostelDetailsState — kept for gradual migration. */
export type HostelDetailsForm = HostelDetailsDraft & {
  hostelAvailable: HostelAvailableChoice;
};

export const HOSTEL_DETAILS_MESSAGES = {
  availableRequired: "Select whether hostel is available",
  feeRequired: "Hostel fee per year is required",
  feeInvalid: "Enter a valid hostel fee per year",
  typeRequired: "Select a hostel type",
  acRequired: "Select AC or Non-AC",
  sharingRequired: "Select a sharing type",
  foodInvalid: "Enter a valid food fee",
  entriesRequired: "Add at least one hostel fee structure",
  duplicateEntry: "This hostel type, AC/Non-AC, and sharing combination is already added",
} as const;

export function emptyHostelDetailsDraft(): HostelDetailsDraft {
  return {
    feePerYear: "",
    hostelType: "",
    acType: "",
    sharingType: "",
    foodFee: "",
  };
}

export function emptyHostelDetailsState(): HostelDetailsState {
  return { hostelAvailable: "", entries: [] };
}

/** @deprecated Use emptyHostelDetailsState */
export function emptyHostelDetailsForm(): HostelDetailsForm {
  return { ...emptyHostelDetailsDraft(), hostelAvailable: "" };
}

export function createHostelDetailsEntry(
  draft: HostelDetailsDraft,
  id = newClientId("hostel"),
): HostelDetailsEntry {
  return {
    id,
    feePerYear: draft.feePerYear.trim(),
    hostelType: draft.hostelType as Exclude<HostelTypeChoice, "">,
    acType: draft.acType as Exclude<HostelAcChoice, "">,
    sharingType: draft.sharingType as Exclude<HostelSharingChoice, "">,
    foodFee: draft.foodFee.trim(),
  };
}

export function hostelEntryToDraft(entry: HostelDetailsEntry): HostelDetailsDraft {
  return {
    feePerYear: entry.feePerYear,
    hostelType: entry.hostelType,
    acType: entry.acType,
    sharingType: entry.sharingType,
    foodFee: entry.foodFee,
  };
}

export function hostelEntryComboKey(entry: Pick<HostelDetailsEntry, "hostelType" | "acType" | "sharingType">): string {
  return `${entry.hostelType}|${entry.acType}|${entry.sharingType}`;
}

export function formatHostelTypeLabel(type: Exclude<HostelTypeChoice, "">): string {
  switch (type) {
    case "BOYS":
      return "Boys Hostel";
    case "GIRLS":
      return "Girls Hostel";
    default:
      return type;
  }
}

export function formatAcLabel(ac: Exclude<HostelAcChoice, "">): string {
  return ac === "AC" ? "AC" : "Non-AC";
}

export function formatSharingLabel(sharing: Exclude<HostelSharingChoice, "">): string {
  return `${sharing} Sharing`;
}

export function formatHostelFeeDisplay(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

function parsePositiveFee(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Validate draft fields before saving a single hostel row. */
export function validateHostelEntryDraft(draft: HostelDetailsDraft): Record<string, string> {
  const errors: Record<string, string> = {};

  const fee = draft.feePerYear.trim();
  if (!fee) {
    errors.hostelFeePerYear = HOSTEL_DETAILS_MESSAGES.feeRequired;
  } else if (parsePositiveFee(fee) === null) {
    errors.hostelFeePerYear = HOSTEL_DETAILS_MESSAGES.feeInvalid;
  }

  if (!draft.hostelType) {
    errors.hostelType = HOSTEL_DETAILS_MESSAGES.typeRequired;
  }

  if (!draft.acType) {
    errors.hostelAcType = HOSTEL_DETAILS_MESSAGES.acRequired;
  }

  if (!draft.sharingType) {
    errors.hostelSharingType = HOSTEL_DETAILS_MESSAGES.sharingRequired;
  }

  const food = draft.foodFee.trim();
  if (food.length > 0 && parsePositiveFee(food) === null) {
    errors.hostelFoodFee = HOSTEL_DETAILS_MESSAGES.foodInvalid;
  }

  return errors;
}

/** Validate full hostel section on wizard submit. */
export function validateHostelDetailsState(state: HostelDetailsState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!state.hostelAvailable) {
    errors.hostelAvailable = HOSTEL_DETAILS_MESSAGES.availableRequired;
    return errors;
  }

  if (state.hostelAvailable === "NO") {
    return errors;
  }

  if (state.entries.length === 0) {
    errors.hostelEntries = HOSTEL_DETAILS_MESSAGES.entriesRequired;
  }

  return errors;
}

/** @deprecated Use validateHostelDetailsState */
export function validateHostelDetails(form: HostelDetailsForm): Record<string, string> {
  const state: HostelDetailsState = {
    hostelAvailable: form.hostelAvailable,
    entries:
      form.hostelAvailable === "YES" &&
      form.feePerYear.trim() &&
      form.hostelType &&
      form.acType &&
      form.sharingType
        ? [createHostelDetailsEntry(form)]
        : [],
  };
  const draftErrors = form.hostelAvailable === "YES" ? validateHostelEntryDraft(form) : {};
  return { ...validateHostelDetailsState(state), ...draftErrors };
}

function sharingChoiceToEnum(choice: HostelSharingChoice): HostelSharing | null {
  switch (choice) {
    case "1":
      return HostelSharing.SINGLE;
    case "2":
      return HostelSharing.TWO_SHARING;
    case "3":
      return HostelSharing.TRIPLE;
    case "4":
      return HostelSharing.FOUR_SHARING;
    default:
      return null;
  }
}

function acChoiceToEnum(choice: HostelAcChoice): HostelRoomType | null {
  if (choice === "AC") return HostelRoomType.AC;
  if (choice === "NON_AC") return HostelRoomType.NON_AC;
  return null;
}

function gendersForType(type: HostelTypeChoice): HostelGender[] {
  if (type === "BOYS") return [HostelGender.BOYS];
  if (type === "GIRLS") return [HostelGender.GIRLS];
  return [];
}

function entryToHostelFeesForm(entry: HostelDetailsEntry): HostelFeesForm {
  const form = emptyHostelFeesForm();
  const sharing = sharingChoiceToEnum(entry.sharingType);
  const roomType = acChoiceToEnum(entry.acType);
  const genders = gendersForType(entry.hostelType);
  if (!entry.feePerYear.trim() || !sharing || !roomType || genders.length === 0) return form;

  for (const gender of genders) {
    const combo = comboForSelection({ gender, roomType, sharing });
    if (combo) form[combo.key] = entry.feePerYear.trim();
  }
  return form;
}

/** Merge all saved hostel rows into the 16-combo fee matrix for persistence. */
export function hostelEntriesToHostelFeesForm(entries: HostelDetailsEntry[]): HostelFeesForm {
  const form = emptyHostelFeesForm();
  for (const entry of entries) {
    const partial = entryToHostelFeesForm(entry);
    for (const combo of HOSTEL_FEE_COMBOS) {
      if (partial[combo.key]) form[combo.key] = partial[combo.key];
    }
  }
  return form;
}

/** First non-empty food fee across saved hostel rows (university-level mess fee). */
export function hostelEntriesFoodFee(entries: HostelDetailsEntry[]): string {
  for (const entry of entries) {
    if (entry.foodFee.trim()) return entry.foodFee.trim();
  }
  return "";
}

/** @deprecated Use hostelEntriesToHostelFeesForm */
export function hostelDetailsToHostelFeesForm(details: HostelDetailsForm): HostelFeesForm {
  if (details.hostelAvailable !== "YES") return emptyHostelFeesForm();
  if (!details.hostelType || !details.acType || !details.sharingType) return emptyHostelFeesForm();
  return entryToHostelFeesForm(createHostelDetailsEntry(details));
}

/** @deprecated Use hostelEntriesFoodFee */
export function hostelDetailsFoodFee(details: HostelDetailsForm): string {
  if (details.hostelAvailable !== "YES") return "";
  return details.foodFee;
}
