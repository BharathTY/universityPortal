import { isValidProgramForLevel } from "@/lib/university-programs";
import {
  emptyHostelFeesForm,
  HOSTEL_FEE_COMBOS,
  type HostelFeeKey,
  type HostelFeesForm,
} from "@/lib/hostel-fee-matrix";

export type { HostelFeesForm, HostelFeeKey };
export { emptyHostelFeesForm, HOSTEL_FEE_COMBOS };

export type CetAllocationMode = "SEATS" | "PERCENT";

export type StreamEntry = {
  id: string;
  programLevel: "UG" | "PG";
  programName: string;
  streamName: string;
  targetStudents: string;
  tuitionYear1: string;
  tuitionTotal: string;
  registrationFee: string;
  applicationFee: string;
  messFee: string;
  examFee: string;
  otherAdminCharges: string;
  otherAdminAmount: string;
  hasOtherAdmin: boolean;
  cetAllocationMode: CetAllocationMode;
  cetAllocationValue: string;
};

export function createEmptyStreamEntry(programLevel: StreamEntry["programLevel"] = "UG"): StreamEntry {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `se-${Date.now()}-${Math.random()}`,
    programLevel,
    programName: "",
    streamName: "",
    targetStudents: "",
    tuitionYear1: "",
    tuitionTotal: "",
    registrationFee: "",
    applicationFee: "",
    messFee: "",
    examFee: "",
    otherAdminCharges: "",
    otherAdminAmount: "",
    hasOtherAdmin: false,
    cetAllocationMode: "SEATS",
    cetAllocationValue: "",
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
  programName: string;
  streamName: string;
  targetStudents: number | null;
  tuitionYear1: number | null;
  tuitionTotal: number | null;
  registrationFee: number | null;
  applicationFee: number | null;
  messFee: number | null;
  examFee: number | null;
  otherAdminCharges: string | null;
  otherAdminAmount: number | null;
  cetAllocationMode: CetAllocationMode;
  cetAllocationValue: number;
};

/** Map stream cards to the existing university create API shape. */
export function streamEntriesToCreatePayload(
  entries: StreamEntry[],
  hostelFees: HostelFeesForm,
  options?: {
    targetStudentsUg?: string;
    targetStudentsPg?: string;
    foodFee?: string;
  },
) {
  const filled = entries.filter(
    (e) => e.programName.trim().length > 0 && e.streamName.trim().length > 0,
  );
  const ugStreams = [
    ...new Set(filled.filter((e) => e.programLevel === "UG").map((e) => e.programName.trim())),
  ];
  const pgStreams = [
    ...new Set(filled.filter((e) => e.programLevel === "PG").map((e) => e.programName.trim())),
  ];

  const streamDetails: StreamDetailPayload[] = filled.map((e) => {
    const rawVal = e.cetAllocationValue.trim();
    const n = Number(rawVal);
    const cetAllocationValue = Number.isFinite(n) && n >= 0 ? n : 0;
    return {
      programLevel: e.programLevel,
      programName: e.programName.trim(),
      streamName: e.streamName.trim(),
      targetStudents: (() => {
        const t = Number(e.targetStudents.trim());
        return Number.isFinite(t) && t >= 0 ? t : null;
      })(),
      tuitionYear1: parseOptionalFee(e.tuitionYear1),
      tuitionTotal: parseOptionalFee(e.tuitionTotal),
      registrationFee: parseOptionalFee(e.registrationFee),
      applicationFee: parseOptionalFee(e.applicationFee),
      messFee: parseOptionalFee(e.messFee),
      examFee: parseOptionalFee(e.examFee),
      otherAdminCharges: e.otherAdminCharges.trim() || null,
      otherAdminAmount: parseOptionalFee(e.otherAdminAmount),
      cetAllocationMode: e.cetAllocationMode,
      cetAllocationValue,
    };
  });

  const cetSeats = streamDetails
    .filter((s) => s.cetAllocationValue > 0)
    .map((s) => ({
      programLevel: s.programLevel,
      programName: s.programName,
      streamName: s.streamName,
      allocationMode: s.cetAllocationMode,
      allocationValue: s.cetAllocationValue,
      seatCount: s.cetAllocationMode === "SEATS" ? Math.round(s.cetAllocationValue) : 0,
    }));

  const targetStudents = streamDetails.reduce((sum, s) => sum + (s.targetStudents ?? 0), 0);
  const ugTarget = Number(options?.targetStudentsUg?.trim() ?? "");
  const pgTarget = Number(options?.targetStudentsPg?.trim() ?? "");
  const combinedTarget =
    (Number.isFinite(ugTarget) && ugTarget > 0 ? ugTarget : 0) +
    (Number.isFinite(pgTarget) && pgTarget > 0 ? pgTarget : 0);
  const foodFeeParsed = parseOptionalFee(options?.foodFee ?? "");

  const applicationFeeRaw = firstStreamFee(filled, "applicationFee");

  const hostelFeesPayload: Partial<Record<HostelFeeKey, number | null>> = {};
  for (const combo of HOSTEL_FEE_COMBOS) {
    hostelFeesPayload[combo.key] = parseOptionalFee(hostelFees[combo.key]);
  }

  return {
    offersUg: ugStreams.length > 0,
    offersPg: pgStreams.length > 0,
    ugStreams,
    pgStreams,
    streamDetails,
    targetStudents: combinedTarget > 0 ? combinedTarget : targetStudents > 0 ? targetStudents : null,
    registrationFee: firstStreamFee(filled, "registrationFee"),
    applicationFee: applicationFeeRaw !== null ? applicationFeeRaw : undefined,
    messFee: foodFeeParsed ?? firstStreamFee(filled, "messFee"),
    examFee: firstStreamFee(filled, "examFee"),
    otherAdminCharges: firstStreamText(filled, "otherAdminCharges"),
    otherAdminAmount: firstStreamFee(filled, "otherAdminAmount"),
    cetSeats,
    hostelFees: hostelFeesPayload,
  };
}

export function validateStreamEntries(entries: StreamEntry[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const filled = entries.filter((entry) => {
    const hasProgram = entry.programName.trim().length > 0;
    const hasStream = entry.streamName.trim().length > 0;
    const hasOtherData = [
      entry.targetStudents,
      entry.registrationFee,
      entry.applicationFee,
      entry.messFee,
      entry.examFee,
      entry.otherAdminCharges,
      entry.otherAdminAmount,
      entry.cetAllocationValue,
    ].some((v) => v.trim().length > 0);
    return hasProgram || hasStream || hasOtherData;
  });

  if (filled.length === 0) {
    errors["streams"] = "Add at least one UG or PG stream";
    return errors;
  }

  const seenCombos = new Set<string>();

  for (const entry of filled) {
    const program = entry.programName.trim();
    const stream = entry.streamName.trim();

    if (!program) {
      errors[`stream-${entry.id}-program`] = "Select a program";
    } else if (!isValidProgramForLevel(entry.programLevel, program)) {
      errors[`stream-${entry.id}-program`] = "Select a valid program for the chosen category";
    }

    if (!stream) {
      errors[`stream-${entry.id}-stream`] = "Enter a stream name";
    }

    if (program && stream) {
      const comboKey = `${entry.programLevel}|${program.toLowerCase()}|${stream.toLowerCase()}`;
      if (seenCombos.has(comboKey)) {
        errors[`stream-${entry.id}-stream`] = "This stream is already added for the same program";
      } else {
        seenCombos.add(comboKey);
      }
    }

    const app = entry.applicationFee.trim();
    if (app.length > 0) {
      if (!/^\d+$/.test(app)) errors[`stream-${entry.id}-applicationFee`] = "Enter a valid application fee";
      else if (Number(app) <= 0) errors[`stream-${entry.id}-applicationFee`] = "Enter a valid application fee";
    }

    const cetRaw = entry.cetAllocationValue.trim();
    if (cetRaw.length > 0) {
      const n = Number(cetRaw);
      if (!Number.isFinite(n) || n < 0) {
        errors[`stream-${entry.id}-cet`] = "Enter a valid CET allocation value";
      } else if (entry.cetAllocationMode === "PERCENT" && n > 100) {
        errors[`stream-${entry.id}-cet`] = "CET percentage cannot exceed 100";
      } else if (entry.cetAllocationMode === "SEATS" && !Number.isInteger(n)) {
        errors[`stream-${entry.id}-cet`] = "Seat count must be a whole number";
      }
    }
  }
  return errors;
}
