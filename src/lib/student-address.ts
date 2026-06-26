export type StructuredAddress = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
};

export const EMPTY_STRUCTURED_ADDRESS: StructuredAddress = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  state: "",
  country: "",
  pincode: "",
};

export function formatAddressForCorrespondence(address: StructuredAddress): string {
  const lines = [
    address.addressLine1.trim(),
    address.addressLine2.trim(),
    [address.city.trim(), address.district.trim()].filter(Boolean).join(", "),
    [address.state.trim(), address.country.trim(), address.pincode.trim()].filter(Boolean).join(", "),
  ].filter(Boolean);
  return lines.join("\n");
}

export function structuredAddressesEqual(a: StructuredAddress, b: StructuredAddress): boolean {
  const norm = (value: string) => value.trim().toLowerCase();
  return (
    norm(a.addressLine1) === norm(b.addressLine1) &&
    norm(a.addressLine2) === norm(b.addressLine2) &&
    norm(a.city) === norm(b.city) &&
    norm(a.district) === norm(b.district) &&
    norm(a.state) === norm(b.state) &&
    norm(a.country) === norm(b.country) &&
    norm(a.pincode) === norm(b.pincode)
  );
}

export function parseCorrespondenceToAddress(text: string | null | undefined): StructuredAddress {
  if (!text?.trim()) return { ...EMPTY_STRUCTURED_ADDRESS };
  const lines = text
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { ...EMPTY_STRUCTURED_ADDRESS, addressLine1: text.trim() };
  }
  const cityDistrict = lines[2]?.split(",").map((part) => part.trim()) ?? [];
  const stateCountryPin = lines[3]?.split(",").map((part) => part.trim()) ?? [];
  return {
    addressLine1: lines[0] ?? "",
    addressLine2: lines[1] ?? "",
    city: cityDistrict[0] ?? "",
    district: cityDistrict.slice(1).join(", "),
    state: stateCountryPin[0] ?? "",
    country: stateCountryPin[1] ?? "",
    pincode: stateCountryPin[2] ?? "",
  };
}

export function permanentAddressFromForm(form: StructuredAddress): StructuredAddress {
  return {
    addressLine1: form.addressLine1,
    addressLine2: form.addressLine2,
    city: form.city,
    district: form.district,
    state: form.state,
    country: form.country,
    pincode: form.pincode,
  };
}

export function currentAddressFromForm(form: {
  currentAddressLine1: string;
  currentAddressLine2: string;
  currentCity: string;
  currentDistrict: string;
  currentState: string;
  currentCountry: string;
  currentPincode: string;
}): StructuredAddress {
  return {
    addressLine1: form.currentAddressLine1,
    addressLine2: form.currentAddressLine2,
    city: form.currentCity,
    district: form.currentDistrict,
    state: form.currentState,
    country: form.currentCountry,
    pincode: form.currentPincode,
  };
}

export type CurrentAddressFormFields = {
  currentSameAsPermanent: boolean;
  currentAddressLine1: string;
  currentAddressLine2: string;
  currentCity: string;
  currentDistrict: string;
  currentState: string;
  currentCountry: string;
  currentPincode: string;
};

export function loadCurrentAddressFields(
  permanent: StructuredAddress,
  correspondenceAddress: string | null | undefined,
): CurrentAddressFormFields {
  const currentParsed = parseCorrespondenceToAddress(correspondenceAddress);
  const sameAsPermanent = structuredAddressesEqual(permanent, currentParsed);
  const current = sameAsPermanent ? permanent : currentParsed;
  return {
    currentSameAsPermanent: sameAsPermanent,
    currentAddressLine1: current.addressLine1,
    currentAddressLine2: current.addressLine2,
    currentCity: current.city,
    currentDistrict: current.district,
    currentState: current.state,
    currentCountry: current.country || "India",
    currentPincode: current.pincode,
  };
}

export function correspondenceFromCurrentForm(form: {
  currentSameAsPermanent: boolean;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
  currentAddressLine1: string;
  currentAddressLine2: string;
  currentCity: string;
  currentDistrict: string;
  currentState: string;
  currentCountry: string;
  currentPincode: string;
}): string | null {
  const current = form.currentSameAsPermanent
    ? permanentAddressFromForm(form)
    : currentAddressFromForm(form);
  const formatted = formatAddressForCorrespondence(current);
  return formatted || null;
}
