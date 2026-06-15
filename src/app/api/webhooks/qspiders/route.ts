import { NextResponse } from "next/server";
import { processQSpidersWebhook } from "@/lib/qspiders-webhook/process-event";
import { isQSpidersWebhookEnabled, verifyQSpidersWebhookSignature } from "@/lib/qspiders-webhook/verify";
import type { QSpidersWebhookEnvelope } from "@/lib/qspiders-webhook/types";

/**
 * Inbound QSpiders webhook — auto-sync universities and catalog reference data.
 *
 * POST /api/webhooks/qspiders
 * Headers: X-QSpiders-Signature (HMAC-SHA256 of raw body, optional in development)
 *
 * Example payload:
 * {
 *   "id": "evt_abc123",
 *   "type": "university.updated",
 *   "data": { "externalId": "uni_1", "name": "Example University", ... }
 * }
 */
export async function POST(req: Request) {
  if (!isQSpidersWebhookEnabled()) {
    return NextResponse.json({ error: "Webhook endpoint is disabled" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signatureError = verifyQSpidersWebhookSignature(req, rawBody);
  if (signatureError) {
    return NextResponse.json({ error: signatureError }, { status: 401 });
  }

  let envelope: QSpidersWebhookEnvelope;
  try {
    envelope = JSON.parse(rawBody) as QSpidersWebhookEnvelope;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const outcome = await processQSpidersWebhook(envelope);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json({
    ok: true,
    duplicate: outcome.duplicate ?? false,
    eventType: outcome.result.eventType,
    action: outcome.result.action,
    summary: outcome.result.summary,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/webhooks/qspiders",
    enabled: isQSpidersWebhookEnabled(),
    events: [
      "university.created",
      "university.updated",
      "qualification_type.created",
      "qualification_type.updated",
      "degree_type.created",
      "degree_type.updated",
      "stream.created",
      "stream.updated",
      "specialization.created",
      "specialization.updated",
    ],
  });
}
