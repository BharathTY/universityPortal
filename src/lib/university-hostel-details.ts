import { HostelGender, HostelRoomType, HostelSharing } from "@prisma/client";
import {
  comboForSelection,
  emptyHostelFeesForm,
  type HostelFeesForm,
} from "@/lib/hostel-fee-matrix";

export type HostelAvailableChoice = "" | "YES" | "NO";
export type HostelTypeChoice = "" | "BOYS" | "GIRLS" | "BOTH";
export type HostelAcChoice = "" | "AC" | "NON_AC";
export type HostelSharingChoice = "" | "1" | "2" | "3" | "4";

export type HostelDetailsForm = {
  hostelAvailable: HostelAvailableChoice;
  feePerYear: string;
  hostelType: HostelTypeChoice;
  acType: HostelAcChoice;
  sharingType: HostelSharingChoice;
  foodFee: string;
};

export const HOSTEL_DETAILS_MESSAGES = {
  availableRequired: "Select whether hostel is available",
  feeRequired: "Hostel fee per year is required",
  feeInvalid: "Enter a valid hostel fee per year",
  typeRequired: "Select a hostel type",
  acRequired: "Select AC or Non-AC",
  sharingRequired: "Select a sharing type",
  foodInvalid: "Enter a valid food fee",
} as const;

export function emptyHostelDetailsForm(): HostelDetailsForm {
  return {
    hostelAvailable: "",
    feePerYear: "",
    hostelType: "",
    acType: "",
    sharingType: "",
    foodFee: "",
  };
}

function parsePositiveFee(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function validateHostelDetails(form: HostelDetailsForm): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.hostelAvailable) {
    errors.hostelAvailable = HOSTEL_DETAILS_MESSAGES.availableRequired;
    return errors;
  }

  if (form.hostelAvailable === "NO") {
    return errors;
  }

  const fee = form.feePerYear.trim();
  if (!fee) {
    errors.hostelFeePerYear = HOSTEL_DETAILS_MESSAGES.feeRequired;
  } else if (parsePositiveFee(fee) === null) {
    errors.hostelFeePerYear = HOSTEL_DETAILS_MESSAGES.feeInvalid;
  }

  if (!form.hostelType) {
    errors.hostelType = HOSTEL_DETAILS_MESSAGES.typeRequired;
  }

  if (!form.acType) {
    errors.hostelAcType = HOSTEL_DETAILS_MESSAGES.acRequired;
  }

  if (!form.sharingType) {
    errors.hostelSharingType = HOSTEL_DETAILS_MESSAGES.sharingRequired;
  }

  const food = form.foodFee.trim();
  if (food.length > 0 && parsePositiveFee(food) === null) {
    errors.hostelFoodFee = HOSTEL_DETAILS_MESSAGES.foodInvalid;
  }

  return errors;
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
  if (type === "BOTH") return [HostelGender.BOYS, HostelGender.GIRLS];
  return [];
}

/** Map simplified hostel details to the existing 16-combo hostel fee matrix for persistence. */
export function hostelDetailsToHostelFeesForm(details: HostelDetailsForm): HostelFeesForm {
  const form = emptyHostelFeesForm();
  if (details.hostelAvailable !== "YES") return form;

  const fee = details.feePerYear.trim();
  const sharing = sharingChoiceToEnum(details.sharingType);
  const roomType = acChoiceToEnum(details.acType);
  const genders = gendersForType(details.hostelType);
  if (!fee || !sharing || !roomType || genders.length === 0) return form;

  for (const gender of genders) {
    const combo = comboForSelection({ gender, roomType, sharing });
    if (combo) form[combo.key] = fee;
  }

  return form;
}

/** Food fee applies only when hostel is available. */
export function hostelDetailsFoodFee(details: HostelDetailsForm): string {
  if (details.hostelAvailable !== "YES") return "";
  return details.foodFee;
}
