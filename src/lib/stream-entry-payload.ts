import { isValidProgramForLevel } from "@/lib/university-programs";
import type { ProgramCatalogSnapshot } from "@/lib/qspiders-program-catalog";
import {
  isValidDegreeForQualification,
  isValidStreamForDegree,
} from "@/lib/qspiders-program-catalog";
import {
  emptyHostelFeesForm,
  HOSTEL_FEE_COMBOS,
  type HostelFeeKey,
  type HostelFeesForm,
} from "@/lib/hostel-fee-matrix";

export type { HostelFeesForm, HostelFeeKey };
export { emptyHostelFeesForm, HOSTEL_FEE_COMBOS };

export type CetAllocationMode = "SEATS" | "PERCENT";

export const SEAT_ALLOCATION_MESSAGES = {
  totalRequired: "Total target seats is required",
  totalInvalid: "Enter a valid whole number of target seats",
  cetRequired: "CET seats / percentage is required",
  cetInvalid: "Enter a valid CET allocation value",
  percentRange: "Percentage must be between 0 and 100",
  seatsWholeNumber: "Seat count must be a whole number",
  seatsExceedTotal: "CET seats cannot exceed total target seats",
} as const;

function parsePositiveInt(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || !/^\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Validate seat allocation fields for a program row with qualification, degree, and stream selected. */
export function validateSeatAllocation(entry: StreamEntry): {
  targetStudents?: string;
  cet?: string;
} {
  const errors: { targetStudents?: string; cet?: string } = {};
  const program = entry.programName.trim();
  const stream = entry.streamName.trim();
  if (!program || !stream) return errors;

  const totalSeats = parsePositiveInt(entry.targetStudents);
  if (entry.targetStudents.trim() === "") {
    errors.targetStudents = SEAT_ALLOCATION_MESSAGES.totalRequired;
  } else if (totalSeats === null || totalSeats <= 0) {
    errors.targetStudents = SEAT_ALLOCATION_MESSAGES.totalInvalid;
  }

  const cetRaw = entry.cetAllocationValue.trim();
  if (cetRaw === "") {
    errors.cet = SEAT_ALLOCATION_MESSAGES.cetRequired;
    return errors;
  }

  if (entry.cetAllocationMode === "PERCENT") {
    const n = Number(cetRaw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      errors.cet = SEAT_ALLOCATION_MESSAGES.percentRange;
    }
    return errors;
  }

  const cetSeats = parsePositiveInt(cetRaw);
  if (cetSeats === null) {
    errors.cet = SEAT_ALLOCATION_MESSAGES.seatsWholeNumber;
  } else if (totalSeats !== null && totalSeats > 0 && cetSeats > totalSeats) {
    errors.cet = SEAT_ALLOCATION_MESSAGES.seatsExceedTotal;
  }

  return errors;
}

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

export const TUITION_FEE_MESSAGES = {
  annualRequired: "Annual tuition fee is required",
  annualInvalid: "Enter a valid annual tuition fee",
  packageInvalid: "Enter a valid overall package fee",
} as const;

/** Validate tuition fee fields when program, degree, and stream are selected. */
export function validateTuitionFees(entry: StreamEntry): {
  tuitionYear1?: string;
  tuitionTotal?: string;
} {
  const errors: { tuitionYear1?: string; tuitionTotal?: string } = {};
  const program = entry.programName.trim();
  const stream = entry.streamName.trim();
  if (!program || !stream) return errors;

  const annual = entry.tuitionYear1.trim();
  if (!annual) {
    errors.tuitionYear1 = TUITION_FEE_MESSAGES.annualRequired;
  } else {
    const n = Number(annual);
    if (!Number.isFinite(n) || n <= 0) {
      errors.tuitionYear1 = TUITION_FEE_MESSAGES.annualInvalid;
    }
  }

  const overallPackage = entry.tuitionTotal.trim();
  if (overallPackage.length > 0) {
    const n = Number(overallPackage);
    if (!Number.isFinite(n) || n <= 0) {
      errors.tuitionTotal = TUITION_FEE_MESSAGES.packageInvalid;
    }
  }

  return errors;
}

export const ADDITIONAL_FEE_MESSAGES = {
  applicationInvalid: "Enter a valid application fee",
  examInvalid: "Enter a valid exam fee",
  otherAdminInvalid: "Enter a valid other administrative fee",
} as const;

/** Validate optional additional fee fields when program and stream are selected. */
export function validateAdditionalFees(entry: StreamEntry): {
  applicationFee?: string;
  examFee?: string;
  otherAdminAmount?: string;
} {
  const errors: {
    applicationFee?: string;
    examFee?: string;
    otherAdminAmount?: string;
  } = {};
  const program = entry.programName.trim();
  const stream = entry.streamName.trim();
  if (!program || !stream) return errors;

  const application = entry.applicationFee.trim();
  if (application.length > 0) {
    if (!/^\d+$/.test(application) || Number(application) <= 0) {
      errors.applicationFee = ADDITIONAL_FEE_MESSAGES.applicationInvalid;
    }
  }

  const exam = entry.examFee.trim();
  if (exam.length > 0) {
    const n = Number(exam);
    if (!Number.isFinite(n) || n <= 0) {
      errors.examFee = ADDITIONAL_FEE_MESSAGES.examInvalid;
    }
  }

  const otherAdmin = entry.otherAdminAmount.trim();
  if (otherAdmin.length > 0) {
    const n = Number(otherAdmin);
    if (!Number.isFinite(n) || n <= 0) {
      errors.otherAdminAmount = ADDITIONAL_FEE_MESSAGES.otherAdminInvalid;
    }
  }

  return errors;
}

export function validateStreamEntries(
  entries: StreamEntry[],
  catalog?: ProgramCatalogSnapshot,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const filled = entries.filter((entry) => {
    const hasProgram = entry.programName.trim().length > 0;
    const hasStream = entry.streamName.trim().length > 0;
    const hasOtherData = [
      entry.targetStudents,
      entry.tuitionYear1,
      entry.tuitionTotal,
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
    errors["streams"] = "Add at least one program";
    return errors;
  }

  const seenCombos = new Set<string>();

  for (const entry of filled) {
    const program = entry.programName.trim();
    const stream = entry.streamName.trim();

    if (!program) {
      errors[`stream-${entry.id}-program`] = "Select a degree type";
    } else if (catalog) {
      if (!isValidDegreeForQualification(catalog, entry.programLevel, program)) {
        errors[`stream-${entry.id}-program`] = "Select a valid degree type for the chosen qualification";
      }
    } else if (!isValidProgramForLevel(entry.programLevel, program)) {
      errors[`stream-${entry.id}-program`] = "Select a valid degree type for the chosen qualification";
    }

    if (!stream) {
      errors[`stream-${entry.id}-stream`] = "Select a stream";
    } else if (catalog && program) {
      if (!isValidStreamForDegree(catalog, entry.programLevel, program, stream)) {
        errors[`stream-${entry.id}-stream`] = "Select a valid stream for the chosen degree type";
      }
    }

    if (program && stream) {
      const comboKey = `${entry.programLevel}|${program.toLowerCase()}|${stream.toLowerCase()}`;
      if (seenCombos.has(comboKey)) {
        errors[`stream-${entry.id}-stream`] = "This stream is already added for the same program";
      } else {
        seenCombos.add(comboKey);
      }

      const seatErrors = validateSeatAllocation(entry);
      if (seatErrors.targetStudents) {
        errors[`stream-${entry.id}-targetStudents`] = seatErrors.targetStudents;
      }
      if (seatErrors.cet) {
        errors[`stream-${entry.id}-cet`] = seatErrors.cet;
      }

      const tuitionErrors = validateTuitionFees(entry);
      if (tuitionErrors.tuitionYear1) {
        errors[`stream-${entry.id}-tuitionYear1`] = tuitionErrors.tuitionYear1;
      }
      if (tuitionErrors.tuitionTotal) {
        errors[`stream-${entry.id}-tuitionTotal`] = tuitionErrors.tuitionTotal;
      }

      const additionalErrors = validateAdditionalFees(entry);
      if (additionalErrors.applicationFee) {
        errors[`stream-${entry.id}-applicationFee`] = additionalErrors.applicationFee;
      }
      if (additionalErrors.examFee) {
        errors[`stream-${entry.id}-examFee`] = additionalErrors.examFee;
      }
      if (additionalErrors.otherAdminAmount) {
        errors[`stream-${entry.id}-otherAdminAmount`] = additionalErrors.otherAdminAmount;
      }
    }
  }
  return errors;
}
