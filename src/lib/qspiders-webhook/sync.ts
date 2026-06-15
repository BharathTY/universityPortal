import type { MasterUniversityType, PrismaClient, ProgramLevel } from "@prisma/client";
import { normalizeIndianState } from "@/lib/indian-states";
import {
  pickBoolean,
  pickInt,
  pickProgramLevel,
  pickString,
  resolveExternalId,
  resolveUniversityType,
  type QSpidersWebhookProcessResult,
} from "@/lib/qspiders-webhook/types";

type Db = Pick<
  PrismaClient,
  | "masterUniversity"
  | "university"
  | "catalogQualificationType"
  | "catalogDegreeType"
  | "catalogStreamSpecialization"
  | "stream"
>;

function catalogCode(raw: Record<string, unknown>, externalId: string, label: string): string {
  const code = pickString(raw, ["code", "slug", "key"]);
  if (code) return code.slice(0, 64);
  const fromLabel = label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return fromLabel || externalId.slice(0, 64);
}

export async function syncUniversityWebhook(
  db: Db,
  data: Record<string, unknown>,
  action: "create" | "update" | "delete",
): Promise<QSpidersWebhookProcessResult> {
  const externalId = resolveExternalId(data);
  if (!externalId) {
    throw new Error("University payload missing external id");
  }

  if (action === "delete") {
    await db.masterUniversity.deleteMany({ where: { externalId } });
    return {
      eventType: "university.deleted",
      action,
      summary: `Removed master university ${externalId}`,
    };
  }

  const name = pickString(data, ["name", "universityName", "university_name"]);
  if (!name) {
    throw new Error("University payload missing name");
  }

  const state = normalizeIndianState(pickString(data, ["state", "stateName"]) || "Unknown");
  const district = pickString(data, ["district", "districtName"]) || state;
  const address =
    pickString(data, ["location", "universityLocation", "address", "university_location"]) || null;
  const city = pickString(data, ["city", "cityName"]) || district;
  const area = pickString(data, ["area", "locality"]) || city;
  const pincode = pickString(data, ["pincode", "pinCode", "postalCode"]) || null;
  const phone = pickString(data, ["phone", "contactNumber", "contact_number", "mobile"]) || null;
  const email = pickString(data, ["email", "universityEmail"]) || null;
  const logoUrl = pickString(data, ["logoUrl", "logo_url", "logo"]) || null;
  const website = pickString(data, ["website", "url"]) || null;
  const shortname = pickString(data, ["shortname", "shortName"]) || null;
  const stateCode = pickString(data, ["stateCode", "state_code"]) || null;
  const universityType = resolveUniversityType(data) as MasterUniversityType;
  const priority = pickBoolean(data, ["priority", "isPriority"], false);

  const master = await db.masterUniversity.upsert({
    where: { externalId },
    create: {
      externalId,
      name,
      shortname,
      state,
      stateCode,
      district,
      address,
      city,
      area,
      pincode,
      phone,
      email,
      logoUrl,
      website,
      universityType,
      priority,
    },
    update: {
      name,
      shortname,
      state,
      stateCode,
      district,
      address,
      city,
      area,
      pincode,
      phone,
      email,
      logoUrl,
      website,
      universityType,
      priority,
    },
  });

  const location =
    address?.trim() ||
    [city, district, state].filter(Boolean).join(", ") ||
    null;

  await db.university.updateMany({
    where: { masterUniversityId: master.id },
    data: {
      name,
      address,
      location,
      state,
      district,
      city,
      area,
      pincode,
      phone: phone ?? undefined,
      email: email ?? undefined,
      logoUrl: logoUrl ?? undefined,
      website: website ?? undefined,
      universityType,
    },
  });

  return {
    eventType: action === "create" ? "university.created" : "university.updated",
    action,
    summary: `Synchronised university ${name} (${externalId})`,
  };
}

export async function syncQualificationTypeWebhook(
  db: Db,
  data: Record<string, unknown>,
  action: "create" | "update" | "delete",
): Promise<QSpidersWebhookProcessResult> {
  const externalId = resolveExternalId(data);
  if (!externalId) throw new Error("Qualification type payload missing external id");

  if (action === "delete") {
    await db.catalogQualificationType.deleteMany({ where: { externalId } });
    return {
      eventType: "qualification_type.deleted",
      action,
      summary: `Removed qualification type ${externalId}`,
    };
  }

  const label = pickString(data, ["label", "name", "title"]);
  if (!label) throw new Error("Qualification type payload missing label");

  const code = catalogCode(data, externalId, label);
  const active = pickBoolean(data, ["active", "isActive"], true);
  const sortOrder = pickInt(data, ["sortOrder", "sort_order", "order"], 0);

  await db.catalogQualificationType.upsert({
    where: { externalId },
    create: { externalId, code, label, active, sortOrder },
    update: { code, label, active, sortOrder },
  });

  return {
    eventType: action === "create" ? "qualification_type.created" : "qualification_type.updated",
    action,
    summary: `Synchronised qualification type ${label}`,
  };
}

export async function syncDegreeTypeWebhook(
  db: Db,
  data: Record<string, unknown>,
  action: "create" | "update" | "delete",
): Promise<QSpidersWebhookProcessResult> {
  const externalId = resolveExternalId(data);
  if (!externalId) throw new Error("Degree type payload missing external id");

  if (action === "delete") {
    await db.catalogDegreeType.deleteMany({ where: { externalId } });
    return {
      eventType: "degree_type.deleted",
      action,
      summary: `Removed degree type ${externalId}`,
    };
  }

  const label = pickString(data, ["label", "name", "title", "degreeType", "degree_type"]);
  if (!label) throw new Error("Degree type payload missing label");

  const code = catalogCode(data, externalId, label);
  const programLevel = pickProgramLevel(data) as ProgramLevel | null;
  const active = pickBoolean(data, ["active", "isActive"], true);
  const sortOrder = pickInt(data, ["sortOrder", "sort_order", "order"], 0);

  await db.catalogDegreeType.upsert({
    where: { externalId },
    create: { externalId, code, label, programLevel, active, sortOrder },
    update: { code, label, programLevel, active, sortOrder },
  });

  return {
    eventType: action === "create" ? "degree_type.created" : "degree_type.updated",
    action,
    summary: `Synchronised degree type ${label}`,
  };
}

export async function syncStreamSpecializationWebhook(
  db: Db,
  data: Record<string, unknown>,
  action: "create" | "update" | "delete",
): Promise<QSpidersWebhookProcessResult> {
  const externalId = resolveExternalId(data);
  if (!externalId) throw new Error("Stream / specialisation payload missing external id");

  if (action === "delete") {
    await db.catalogStreamSpecialization.deleteMany({ where: { externalId } });
    await db.stream.updateMany({
      where: { externalId },
      data: { externalId: null },
    });
    return {
      eventType: "stream.deleted",
      action,
      summary: `Removed stream / specialisation ${externalId}`,
    };
  }

  const name = pickString(data, ["name", "label", "streamName", "stream_name", "specialization", "specialisation"]);
  if (!name) throw new Error("Stream / specialisation payload missing name");

  const code = pickString(data, ["code", "slug"]) || null;
  const degreeTypeExternalId =
    pickString(data, ["degreeTypeExternalId", "degree_type_external_id", "degreeTypeId"]) || null;
  const universityExternalId =
    pickString(data, ["universityExternalId", "university_external_id", "universityId"]) || null;
  const active = pickBoolean(data, ["active", "isActive"], true);
  const sortOrder = pickInt(data, ["sortOrder", "sort_order", "order"], 0);
  const degreeTypeLabel = pickString(data, ["degreeType", "degree_type", "programName"]);

  await db.catalogStreamSpecialization.upsert({
    where: { externalId },
    create: {
      externalId,
      code,
      name,
      degreeTypeExternalId,
      universityExternalId,
      active,
      sortOrder,
    },
    update: {
      code,
      name,
      degreeTypeExternalId,
      universityExternalId,
      active,
      sortOrder,
    },
  });

  const programLevel = pickProgramLevel(data);

  if (universityExternalId) {
    const master = await db.masterUniversity.findUnique({
      where: { externalId: universityExternalId },
      select: { id: true },
    });
    if (master) {
      const onboarded = await db.university.findMany({
        where: { masterUniversityId: master.id },
        select: { id: true },
      });
      for (const uni of onboarded) {
        await db.stream.upsert({
          where: {
            universityId_name: { universityId: uni.id, name },
          },
          create: {
            universityId: uni.id,
            name,
            externalId,
            degreeType: degreeTypeLabel || null,
            programLevel,
          },
          update: {
            externalId,
            degreeType: degreeTypeLabel || undefined,
            programLevel: programLevel ?? undefined,
          },
        });
      }
    }
  } else {
    await db.stream.updateMany({
      where: { externalId },
      data: {
        name,
        degreeType: degreeTypeLabel || undefined,
        programLevel: programLevel ?? undefined,
      },
    });
  }

  return {
    eventType: action === "create" ? "stream.created" : "stream.updated",
    action,
    summary: `Synchronised stream / specialisation ${name}`,
  };
}
