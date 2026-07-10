import { validateGstNumber, validatePanNumber } from "@/lib/indian-tax-ids";
import { isDistrictInState, isKnownIndianState } from "@/lib/indian-districts";
import {
  createEmptyConsultantSpocDraft,
  filledConsultantSpocRows,
  isConsultantSpocRowFilled,
  type ConsultantSpocDraft,
} from "@/lib/consultant-spoc";

export const CONSULTANT_FORM_MESSAGES = {
  nameRequired: "Consultant Name is required.",
  nameLetters: "Consultant Name must contain only letters.",
  nameMin: "Consultant Name must be at least 3 characters.",
  emailRequired: "Email ID is required.",
  emailInvalid: "Please enter a valid Email ID.",
  phoneRequired: "Phone Number is required.",
  phoneDigits: "Phone Number must contain only digits.",
  phoneInvalid: "Please enter a valid Phone Number.",
  gstInvalid: "Please enter a valid GST Number.",
  panInvalid: "Please enter a valid PAN Number.",
  stateRequired: "Please select a State.",
  districtRequired: "Please select a District.",
  addressRequired: "Address is required.",
  academicYearRequired: "Please select an Academic Year.",
  mouRequired: "Please upload the MOU document.",
  universitiesRequired: "Please select at least one university.",
  universitiesNone: "No universities available to assign",
} as const;

const NAME_OK = /^[\p{L} ]+$/u;

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function spocFieldKey(index: number, field: string, rowCount: number): string {
  if (rowCount === 1) return `spoc${field.charAt(0).toUpperCase()}${field.slice(1)}`;
  return `spocs.${index}${field.charAt(0).toUpperCase()}${field.slice(1)}`;
}

export type ConsultantFormValidationInput = {
  name: string;
  email: string;
  phone: string;
  selectedCount: number;
  universitiesAvailable: number;
  academicYear: string;
  hasMouFile: boolean;
  requireMouFile: boolean;
  gstNumber: string;
  panNumber: string;
  address: string;
  district: string;
  state: string;
  addSpoc: boolean;
  spocRows: ConsultantSpocDraft[];
};

export function validateConsultantForm(input: ConsultantFormValidationInput): Record<string, string> {
  const e: Record<string, string> = {};
  const n = input.name.trim();
  if (n.length === 0) e.name = CONSULTANT_FORM_MESSAGES.nameRequired;
  else if (!NAME_OK.test(n)) e.name = CONSULTANT_FORM_MESSAGES.nameLetters;
  else if (n.length < 3) e.name = CONSULTANT_FORM_MESSAGES.nameMin;

  const em = input.email.trim();
  if (em.length === 0) e.email = CONSULTANT_FORM_MESSAGES.emailRequired;
  else if (!looksLikeEmail(em)) e.email = CONSULTANT_FORM_MESSAGES.emailInvalid;

  const p = input.phone.trim();
  if (p.length === 0) e.phone = CONSULTANT_FORM_MESSAGES.phoneRequired;
  else if (!/^\d+$/.test(p)) e.phone = CONSULTANT_FORM_MESSAGES.phoneDigits;
  else if (p.length !== 10) e.phone = CONSULTANT_FORM_MESSAGES.phoneInvalid;

  if (!input.address.trim()) e.address = CONSULTANT_FORM_MESSAGES.addressRequired;
  if (!input.state.trim() || !isKnownIndianState(input.state)) {
    e.state = CONSULTANT_FORM_MESSAGES.stateRequired;
  }
  if (!input.district.trim() || !isDistrictInState(input.state, input.district)) {
    e.district = CONSULTANT_FORM_MESSAGES.districtRequired;
  }

  if (input.requireMouFile && !input.hasMouFile) {
    e.mouFile = CONSULTANT_FORM_MESSAGES.mouRequired;
  }
  if (input.hasMouFile && !input.academicYear.trim()) {
    e.academicYear = CONSULTANT_FORM_MESSAGES.academicYearRequired;
  }
  if (input.requireMouFile && !input.academicYear.trim()) {
    e.academicYear = CONSULTANT_FORM_MESSAGES.academicYearRequired;
  }

  if (input.universitiesAvailable > 0 && input.selectedCount < 1) {
    e.universityIds = CONSULTANT_FORM_MESSAGES.universitiesRequired;
  }
  if (input.universitiesAvailable === 0) {
    e.universityIds = CONSULTANT_FORM_MESSAGES.universitiesNone;
  }

  const gstErr = validateGstNumber(input.gstNumber);
  if (gstErr) e.gstNumber = CONSULTANT_FORM_MESSAGES.gstInvalid;
  const panErr = validatePanNumber(input.panNumber);
  if (panErr) e.panNumber = CONSULTANT_FORM_MESSAGES.panInvalid;

  if (input.addSpoc) {
    const rowsToValidate =
      input.spocRows.length === 1 ? input.spocRows : input.spocRows.filter(isConsultantSpocRowFilled);

    if (rowsToValidate.length === 0) {
      e[spocFieldKey(0, "name", input.spocRows.length)] = "Add at least one SPOC or uncheck Add SPOC";
    }

    const seenEmails = new Set<string>();
    for (let i = 0; i < rowsToValidate.length; i++) {
      const row = rowsToValidate[i]!;
      const rowIndex = input.spocRows.indexOf(row);
      const prefix = (field: string) => spocFieldKey(rowIndex, field, input.spocRows.length);

      const sn = row.name.trim();
      if (sn.length === 0) e[prefix("name")] = "SPOC name is required";
      else if (!NAME_OK.test(sn)) e[prefix("name")] = CONSULTANT_FORM_MESSAGES.nameLetters;
      else if (sn.length < 3) e[prefix("name")] = CONSULTANT_FORM_MESSAGES.nameMin;

      const sem = row.email.trim();
      if (sem.length === 0) e[prefix("email")] = CONSULTANT_FORM_MESSAGES.emailRequired;
      else if (!looksLikeEmail(sem)) e[prefix("email")] = CONSULTANT_FORM_MESSAGES.emailInvalid;
      else if (sem.toLowerCase() === input.email.trim().toLowerCase()) {
        e[prefix("email")] = "SPOC email must differ from the consultant email";
      } else if (seenEmails.has(sem.toLowerCase())) {
        e[prefix("email")] = "Each SPOC must have a unique email";
      } else {
        seenEmails.add(sem.toLowerCase());
      }

      const sp = row.phone.trim();
      if (sp.length === 0) e[prefix("phone")] = CONSULTANT_FORM_MESSAGES.phoneRequired;
      else if (!/^\d+$/.test(sp)) e[prefix("phone")] = CONSULTANT_FORM_MESSAGES.phoneDigits;
      else if (sp.length !== 10) e[prefix("phone")] = CONSULTANT_FORM_MESSAGES.phoneInvalid;

      const sw = row.whatsapp.trim();
      if (sw.length > 0) {
        if (!/^\d+$/.test(sw)) e[prefix("whatsapp")] = CONSULTANT_FORM_MESSAGES.phoneDigits;
        else if (sw.length !== 10) e[prefix("whatsapp")] = CONSULTANT_FORM_MESSAGES.phoneInvalid;
      }
    }
  }

  return e;
}

export { createEmptyConsultantSpocDraft, filledConsultantSpocRows };
