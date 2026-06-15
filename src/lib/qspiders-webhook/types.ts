/** Supported QSpiders → Eduversity webhook event types. */
export const QSPIDERS_WEBHOOK_EVENTS = [
  "university.created",
  "university.updated",
  "university.deleted",
  "qualification_type.created",
  "qualification_type.updated",
  "qualification_type.deleted",
  "degree_type.created",
  "degree_type.updated",
  "degree_type.deleted",
  "stream.created",
  "stream.updated",
  "stream.deleted",
  "specialization.created",
  "specialization.updated",
  "specialization.deleted",
] as const;

export type QSpidersWebhookEventType = (typeof QSPIDERS_WEBHOOK_EVENTS)[number];

export type QSpidersWebhookEnvelope = {
  id?: string;
  eventId?: string;
  type?: string;
  event?: string;
  eventType?: string;
  action?: "create" | "update" | "delete" | "created" | "updated" | "deleted";
  timestamp?: string;
  data?: unknown;
  payload?: unknown;
};

export type QSpidersWebhookProcessResult = {
  eventType: QSpidersWebhookEventType;
  action: "create" | "update" | "delete";
  summary: string;
};

export function normalizeWebhookEventType(raw: string): QSpidersWebhookEventType | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_").replace(/[-.]/g, "_");
  const aliases: Record<string, QSpidersWebhookEventType> = {
    university_created: "university.created",
    university_updated: "university.updated",
    university_deleted: "university.deleted",
    qualification_type_created: "qualification_type.created",
    qualification_type_updated: "qualification_type.updated",
    qualification_type_deleted: "qualification_type.deleted",
    qualification_types_created: "qualification_type.created",
    qualification_types_updated: "qualification_type.updated",
    qualification_types_deleted: "qualification_type.deleted",
    degree_type_created: "degree_type.created",
    degree_type_updated: "degree_type.updated",
    degree_type_deleted: "degree_type.deleted",
    degree_types_created: "degree_type.created",
    degree_types_updated: "degree_type.updated",
    degree_types_deleted: "degree_type.deleted",
    stream_created: "stream.created",
    stream_updated: "stream.updated",
    stream_deleted: "stream.deleted",
    streams_created: "stream.created",
    streams_updated: "stream.updated",
    streams_deleted: "stream.deleted",
    specialization_created: "specialization.created",
    specialization_updated: "specialization.updated",
    specialization_deleted: "specialization.deleted",
    specialisation_created: "specialization.created",
    specialisation_updated: "specialization.updated",
    specialisation_deleted: "specialization.deleted",
  };

  if ((QSPIDERS_WEBHOOK_EVENTS as readonly string[]).includes(key)) {
    return key as QSpidersWebhookEventType;
  }
  return aliases[key] ?? null;
}

export function webhookActionFromEventType(
  eventType: QSpidersWebhookEventType,
): "create" | "update" | "delete" {
  if (eventType.endsWith(".created")) return "create";
  if (eventType.endsWith(".deleted")) return "delete";
  return "update";
}

export function resolveWebhookEventType(envelope: QSpidersWebhookEnvelope): QSpidersWebhookEventType | null {
  const raw = envelope.type ?? envelope.event ?? envelope.eventType ?? "";
  if (raw) {
    const normalized = normalizeWebhookEventType(raw);
    if (normalized) return normalized;
  }

  const entity = pickString(envelope as Record<string, unknown>, ["entity", "resource", "model"]);
  const actionRaw = (envelope.action ?? "").toLowerCase();
  let actionSuffix = "updated";
  if (actionRaw === "create" || actionRaw === "created") actionSuffix = "created";
  else if (actionRaw === "delete" || actionRaw === "deleted") actionSuffix = "deleted";
  if (entity) {
    const composite = `${entity}.${actionSuffix}`.toLowerCase();
    return normalizeWebhookEventType(composite);
  }

  return null;
}

export function resolveWebhookDeliveryId(envelope: QSpidersWebhookEnvelope): string {
  const id = envelope.id ?? envelope.eventId;
  if (typeof id === "string" && id.trim()) return id.trim();
  return "";
}

export function resolveWebhookData(envelope: QSpidersWebhookEnvelope): Record<string, unknown> {
  const raw = envelope.data ?? envelope.payload ?? envelope;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

export function pickString(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

export function pickBoolean(raw: Record<string, unknown>, keys: string[], fallback = true): boolean {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === "boolean") return v;
    if (v === "true" || v === 1) return true;
    if (v === "false" || v === 0) return false;
  }
  return fallback;
}

export function pickInt(raw: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return Math.trunc(n);
    }
  }
  return fallback;
}

export function pickProgramLevel(raw: Record<string, unknown>): "UG" | "PG" | null {
  const v = pickString(raw, ["programLevel", "program_level", "level"]).toUpperCase();
  if (v === "UG" || v === "UNDERGRADUATE" || v === "UNDER_GRADUATE") return "UG";
  if (v === "PG" || v === "POSTGRADUATE" || v === "POST_GRADUATE") return "PG";
  return null;
}

export function resolveExternalId(raw: Record<string, unknown>): string {
  return pickString(raw, ["externalId", "external_id", "id", "universityId", "qualificationTypeId", "degreeTypeId", "streamId", "specializationId"]);
}

export function resolveUniversityType(raw: Record<string, unknown>): "PRIVATE" | "DEEMED" | "STATE_GOVT" {
  const v = pickString(raw, ["universityType", "university_type", "type"]).toUpperCase();
  if (v === "DEEMED") return "DEEMED";
  if (v === "STATE_GOVT" || v === "GOVT" || v === "GOVERNMENT" || v === "STATE") return "STATE_GOVT";
  return "PRIVATE";
}
