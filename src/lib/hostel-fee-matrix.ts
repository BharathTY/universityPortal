import { HostelGender, HostelRoomType, HostelSharing } from "@prisma/client";

export type HostelFeeKey =
  | "girlsAcSingle"
  | "girlsAcDouble"
  | "girlsAcTriple"
  | "girlsAcFour"
  | "girlsNonAcSingle"
  | "girlsNonAcDouble"
  | "girlsNonAcTriple"
  | "girlsNonAcFour"
  | "boysAcSingle"
  | "boysAcDouble"
  | "boysAcTriple"
  | "boysAcFour"
  | "boysNonAcSingle"
  | "boysNonAcDouble"
  | "boysNonAcTriple"
  | "boysNonAcFour";

export type HostelFeesForm = Record<HostelFeeKey, string>;

export const HOSTEL_FEE_COMBOS: {
  key: HostelFeeKey;
  gender: HostelGender;
  genderLabel: string;
  roomType: HostelRoomType;
  roomLabel: string;
  sharing: HostelSharing;
  sharingLabel: string;
}[] = [
  { key: "girlsAcSingle", gender: HostelGender.GIRLS, genderLabel: "Girls Hostel", roomType: HostelRoomType.AC, roomLabel: "AC", sharing: HostelSharing.SINGLE, sharingLabel: "Single sharing" },
  { key: "girlsAcDouble", gender: HostelGender.GIRLS, genderLabel: "Girls Hostel", roomType: HostelRoomType.AC, roomLabel: "AC", sharing: HostelSharing.TWO_SHARING, sharingLabel: "Double sharing" },
  { key: "girlsAcTriple", gender: HostelGender.GIRLS, genderLabel: "Girls Hostel", roomType: HostelRoomType.AC, roomLabel: "AC", sharing: HostelSharing.TRIPLE, sharingLabel: "Triple sharing" },
  { key: "girlsAcFour", gender: HostelGender.GIRLS, genderLabel: "Girls Hostel", roomType: HostelRoomType.AC, roomLabel: "AC", sharing: HostelSharing.FOUR_SHARING, sharingLabel: "Four sharing" },
  { key: "girlsNonAcSingle", gender: HostelGender.GIRLS, genderLabel: "Girls Hostel", roomType: HostelRoomType.NON_AC, roomLabel: "Non-AC", sharing: HostelSharing.SINGLE, sharingLabel: "Single sharing" },
  { key: "girlsNonAcDouble", gender: HostelGender.GIRLS, genderLabel: "Girls Hostel", roomType: HostelRoomType.NON_AC, roomLabel: "Non-AC", sharing: HostelSharing.TWO_SHARING, sharingLabel: "Double sharing" },
  { key: "girlsNonAcTriple", gender: HostelGender.GIRLS, genderLabel: "Girls Hostel", roomType: HostelRoomType.NON_AC, roomLabel: "Non-AC", sharing: HostelSharing.TRIPLE, sharingLabel: "Triple sharing" },
  { key: "girlsNonAcFour", gender: HostelGender.GIRLS, genderLabel: "Girls Hostel", roomType: HostelRoomType.NON_AC, roomLabel: "Non-AC", sharing: HostelSharing.FOUR_SHARING, sharingLabel: "Four sharing" },
  { key: "boysAcSingle", gender: HostelGender.BOYS, genderLabel: "Boys Hostel", roomType: HostelRoomType.AC, roomLabel: "AC", sharing: HostelSharing.SINGLE, sharingLabel: "Single sharing" },
  { key: "boysAcDouble", gender: HostelGender.BOYS, genderLabel: "Boys Hostel", roomType: HostelRoomType.AC, roomLabel: "AC", sharing: HostelSharing.TWO_SHARING, sharingLabel: "Double sharing" },
  { key: "boysAcTriple", gender: HostelGender.BOYS, genderLabel: "Boys Hostel", roomType: HostelRoomType.AC, roomLabel: "AC", sharing: HostelSharing.TRIPLE, sharingLabel: "Triple sharing" },
  { key: "boysAcFour", gender: HostelGender.BOYS, genderLabel: "Boys Hostel", roomType: HostelRoomType.AC, roomLabel: "AC", sharing: HostelSharing.FOUR_SHARING, sharingLabel: "Four sharing" },
  { key: "boysNonAcSingle", gender: HostelGender.BOYS, genderLabel: "Boys Hostel", roomType: HostelRoomType.NON_AC, roomLabel: "Non-AC", sharing: HostelSharing.SINGLE, sharingLabel: "Single sharing" },
  { key: "boysNonAcDouble", gender: HostelGender.BOYS, genderLabel: "Boys Hostel", roomType: HostelRoomType.NON_AC, roomLabel: "Non-AC", sharing: HostelSharing.TWO_SHARING, sharingLabel: "Double sharing" },
  { key: "boysNonAcTriple", gender: HostelGender.BOYS, genderLabel: "Boys Hostel", roomType: HostelRoomType.NON_AC, roomLabel: "Non-AC", sharing: HostelSharing.TRIPLE, sharingLabel: "Triple sharing" },
  { key: "boysNonAcFour", gender: HostelGender.BOYS, genderLabel: "Boys Hostel", roomType: HostelRoomType.NON_AC, roomLabel: "Non-AC", sharing: HostelSharing.FOUR_SHARING, sharingLabel: "Four sharing" },
];

export function emptyHostelFeesForm(): HostelFeesForm {
  return Object.fromEntries(HOSTEL_FEE_COMBOS.map((c) => [c.key, ""])) as HostelFeesForm;
}

export type HostelSelection = {
  gender: HostelGender;
  roomType: HostelRoomType;
  sharing: HostelSharing;
};

export function comboForSelection(sel: HostelSelection) {
  return HOSTEL_FEE_COMBOS.find(
    (c) => c.gender === sel.gender && c.roomType === sel.roomType && c.sharing === sel.sharing,
  );
}

export type HostelFeeDbRow = {
  gender: HostelGender;
  roomType: HostelRoomType;
  sharing: HostelSharing;
  amount: unknown;
};

export type HostelFeeAmounts = Record<HostelFeeKey, number | null>;

export function emptyHostelFeeAmounts(): HostelFeeAmounts {
  return Object.fromEntries(HOSTEL_FEE_COMBOS.map((c) => [c.key, null])) as HostelFeeAmounts;
}

function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(String(value));
  return Number.isFinite(n) ? n : null;
}

export function hostelFeeAmountsFromDb(rows: HostelFeeDbRow[]): HostelFeeAmounts {
  const out = emptyHostelFeeAmounts();
  for (const row of rows) {
    const combo = HOSTEL_FEE_COMBOS.find(
      (c) => c.gender === row.gender && c.roomType === row.roomType && c.sharing === row.sharing,
    );
    if (combo) out[combo.key] = decimalToNumber(row.amount);
  }
  return out;
}

export function hostelFeesFormFromAmounts(amounts: HostelFeeAmounts): HostelFeesForm {
  const out = emptyHostelFeesForm();
  for (const combo of HOSTEL_FEE_COMBOS) {
    const n = amounts[combo.key];
    out[combo.key] = n != null && Number.isFinite(n) ? String(n) : "";
  }
  return out;
}

export function hostelFeesFormFromDb(rows: HostelFeeDbRow[]): HostelFeesForm {
  return hostelFeesFormFromAmounts(hostelFeeAmountsFromDb(rows));
}

export function hostelFeeAmountsFromForm(form: HostelFeesForm): HostelFeeAmounts {
  const out = emptyHostelFeeAmounts();
  for (const combo of HOSTEL_FEE_COMBOS) {
    const raw = form[combo.key].trim();
    if (raw === "") {
      out[combo.key] = null;
      continue;
    }
    const n = Number(raw);
    out[combo.key] = Number.isFinite(n) && n >= 0 ? n : null;
  }
  return out;
}

export function minHostelFeeAmount(rows: { amount: unknown }[]): number | null {
  let min: number | null = null;
  for (const row of rows) {
    const n = decimalToNumber(row.amount);
    if (n != null && n > 0 && (min == null || n < min)) min = n;
  }
  return min;
}
