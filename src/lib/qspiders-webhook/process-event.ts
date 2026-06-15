import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  syncDegreeTypeWebhook,
  syncQualificationTypeWebhook,
  syncStreamSpecializationWebhook,
  syncUniversityWebhook,
} from "@/lib/qspiders-webhook/sync";
import {
  resolveWebhookData,
  resolveWebhookDeliveryId,
  resolveWebhookEventType,
  webhookActionFromEventType,
  type QSpidersWebhookEnvelope,
  type QSpidersWebhookProcessResult,
} from "@/lib/qspiders-webhook/types";

export type ProcessQSpidersWebhookResult =
  | { ok: true; duplicate?: boolean; result: QSpidersWebhookProcessResult }
  | { ok: false; status: number; error: string };

async function recordDelivery(
  db: Pick<PrismaClient, "qSpidersWebhookEvent">,
  deliveryId: string,
  eventType: string,
  status: "processed" | "failed" | "duplicate",
  error?: string,
) {
  if (status === "duplicate") return;
  await db.qSpidersWebhookEvent.create({
    data: {
      deliveryId,
      eventType,
      status,
      error: error ?? null,
      processedAt: new Date(),
    },
  });
}

export async function processQSpidersWebhook(
  envelope: QSpidersWebhookEnvelope,
  db: PrismaClient = prisma,
): Promise<ProcessQSpidersWebhookResult> {
  const eventType = resolveWebhookEventType(envelope);
  if (!eventType) {
    return { ok: false, status: 400, error: "Unsupported or missing webhook event type" };
  }

  const deliveryId = resolveWebhookDeliveryId(envelope);
  if (!deliveryId) {
    return { ok: false, status: 400, error: "Webhook delivery id is required (id or eventId)" };
  }

  const existing = await db.qSpidersWebhookEvent.findUnique({
    where: { deliveryId },
    select: { id: true, status: true },
  });
  if (existing?.status === "processed") {
    return {
      ok: true,
      duplicate: true,
      result: {
        eventType,
        action: webhookActionFromEventType(eventType),
        summary: "Duplicate delivery ignored",
      },
    };
  }

  const data = resolveWebhookData(envelope);
  const action = webhookActionFromEventType(eventType);

  try {
    let result: QSpidersWebhookProcessResult;

    if (eventType.startsWith("university.")) {
      result = await syncUniversityWebhook(db, data, action);
    } else if (eventType.startsWith("qualification_type.")) {
      result = await syncQualificationTypeWebhook(db, data, action);
    } else if (eventType.startsWith("degree_type.")) {
      result = await syncDegreeTypeWebhook(db, data, action);
    } else {
      result = await syncStreamSpecializationWebhook(db, data, action);
    }

    await recordDelivery(db, deliveryId, eventType, "processed");
    return { ok: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook sync failed";
    await recordDelivery(db, deliveryId, eventType, "failed", message);
    return { ok: false, status: 422, error: message };
  }
}
