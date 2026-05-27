export type StreamEntry = {
  id: string;
  programLevel: "UG" | "PG";
  streamName: string;
  targetStudents: string;
  registrationFee: string;
  applicationFee: string;
  messFee: string;
  examFee: string;
  otherAdminCharges: string;
  otherAdminAmount: string;
  cetSeats: string;
};

export type HostelFeesForm = {
  girlsAc2: string;
  girlsAc4: string;
  girlsNonAc2: string;
  girlsNonAc4: string;
  boysAc2: string;
  boysAc4: string;
  boysNonAc2: string;
  boysNonAc4: string;
};

export function createEmptyStreamEntry(programLevel: StreamEntry["programLevel"] = "UG"): StreamEntry {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `se-${Date.now()}-${Math.random()}`,
    programLevel,
    streamName: "",
    targetStudents: "",
    registrationFee: "",
    applicationFee: "",
    messFee: "",
    examFee: "",
    otherAdminCharges: "",
    otherAdminAmount: "",
    cetSeats: "",
  };
}

export function emptyHostelFeesForm(): HostelFeesForm {
  return {
    girlsAc2: "",
    girlsAc4: "",
    girlsNonAc2: "",
    girlsNonAc4: "",
    boysAc2: "",
    boysAc4: "",
    boysNonAc2: "",
    boysNonAc4: "",
  };
}

function parseOptionalFee(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function firstStreamFee(entries: StreamEntry[], key: keyof StreamEntry): number | null {
  for (const entry of entries) {
    const value = parseOptionalFee(String(entry[key]));
    if (value !== null) return value;
  }
  return null;
}

function firstStreamText(entries: StreamEntry[], key: keyof StreamEntry): string | null {
  for (const entry of entries) {
    const value = String(entry[key]).trim();
    if (value) return value;
  }
  return null;
}

export type StreamDetailPayload = {
  programLevel: "UG" | "PG";
  streamName: string;
  targetStudents: number | null;
  registrationFee: number | null;
  applicationFee: number | null;
  messFee: number | null;
  examFee: number | null;
  otherAdminCharges: string | null;
  otherAdminAmount: number | null;
  cetSeats: number;
};

/** Map stream cards to the existing university create API shape. */
export function streamEntriesToCreatePayload(entries: StreamEntry[], hostelFees: HostelFeesForm) {
  const filled = entries.filter((e) => e.streamName.trim().length > 0);
  const ugStreams = filled.filter((e) => e.programLevel === "UG").map((e) => e.streamName.trim());
  const pgStreams = filled.filter((e) => e.programLevel === "PG").map((e) => e.streamName.trim());

  const streamDetails: StreamDetailPayload[] = filled.map((e) => ({
    programLevel: e.programLevel,
    streamName: e.streamName.trim(),
    targetStudents: (() => {
      const n = Number(e.targetStudents.trim());
      return Number.isFinite(n) && n >= 0 ? n : null;
    })(),
    registrationFee: parseOptionalFee(e.registrationFee),
    applicationFee: parseOptionalFee(e.applicationFee),
    messFee: parseOptionalFee(e.messFee),
    examFee: parseOptionalFee(e.examFee),
    otherAdminCharges: e.otherAdminCharges.trim() || null,
    otherAdminAmount: parseOptionalFee(e.otherAdminAmount),
    cetSeats: (() => {
      const n = Number(e.cetSeats.trim());
      return Number.isFinite(n) && n >= 0 ? n : 0;
    })(),
  }));

  const cetSeats = streamDetails
    .filter((s) => s.cetSeats > 0)
    .map((s) => ({
      programLevel: s.programLevel,
      streamName: s.streamName,
      seatCount: s.cetSeats,
    }));

  const targetStudents = streamDetails.reduce((sum, s) => sum + (s.targetStudents ?? 0), 0);

  const applicationFeeRaw = firstStreamFee(filled, "applicationFee");

  return {
    offersUg: ugStreams.length > 0,
    offersPg: pgStreams.length > 0,
    ugStreams,
    pgStreams,
    streamDetails,
    targetStudents: targetStudents > 0 ? targetStudents : null,
    registrationFee: firstStreamFee(filled, "registrationFee"),
    applicationFee: applicationFeeRaw !== null ? applicationFeeRaw : undefined,
    messFee: firstStreamFee(filled, "messFee"),
    examFee: firstStreamFee(filled, "examFee"),
    otherAdminCharges: firstStreamText(filled, "otherAdminCharges"),
    otherAdminAmount: firstStreamFee(filled, "otherAdminAmount"),
    cetSeats,
    hostelFees: {
      girlsAc2: parseOptionalFee(hostelFees.girlsAc2),
      girlsAc4: parseOptionalFee(hostelFees.girlsAc4),
      girlsNonAc2: parseOptionalFee(hostelFees.girlsNonAc2),
      girlsNonAc4: parseOptionalFee(hostelFees.girlsNonAc4),
      boysAc2: parseOptionalFee(hostelFees.boysAc2),
      boysAc4: parseOptionalFee(hostelFees.boysAc4),
      boysNonAc2: parseOptionalFee(hostelFees.boysNonAc2),
      boysNonAc4: parseOptionalFee(hostelFees.boysNonAc4),
    },
  };
}

export function validateStreamEntries(entries: StreamEntry[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const entry of entries) {
    if (!entry.streamName.trim()) continue;
    const app = entry.applicationFee.trim();
    if (app.length > 0) {
      if (!/^\d+$/.test(app)) errors[`stream-${entry.id}-applicationFee`] = "Enter a valid application fee";
      else if (Number(app) <= 0) errors[`stream-${entry.id}-applicationFee`] = "Enter a valid application fee";
    }
  }
  return errors;
}
