import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_HEADERS = [
  "x-qspiders-signature",
  "x-webhook-signature",
  "x-signature",
  "x-hub-signature-256",
] as const;

function parseSignatureHeader(value: string): string {
  const trimmed = value.trim();
  const shaPrefix = "sha256=";
  if (trimmed.toLowerCase().startsWith(shaPrefix)) {
    return trimmed.slice(shaPrefix.length).trim();
  }
  return trimmed;
}

/** Verify HMAC-SHA256 webhook signature when QSPIDERS_WEBHOOK_SECRET is configured. */
export function verifyQSpidersWebhookSignature(req: Request, rawBody: string): string | null {
  const secret = process.env.QSPIDERS_WEBHOOK_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return "Webhook secret is not configured";
    }
    return null;
  }

  let provided: string | null = null;
  for (const header of SIGNATURE_HEADERS) {
    const value = req.headers.get(header);
    if (value?.trim()) {
      provided = parseSignatureHeader(value);
      break;
    }
  }

  if (!provided) {
    return "Missing webhook signature header";
  }

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(provided, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return "Invalid webhook signature";
    }
  } catch {
    return "Invalid webhook signature";
  }

  return null;
}

export function isQSpidersWebhookEnabled(): boolean {
  return process.env.QSPIDERS_WEBHOOK_ENABLED !== "false";
}
