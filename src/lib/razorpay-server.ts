import crypto from "node:crypto";

type CreateOrderResult =
  | { ok: true; orderId: string; amount: number; currency: string }
  | { ok: false; error: string };

/**
 * Creates a Razorpay order (amount in paise). Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.
 */
export async function razorpayCreateOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreateOrderResult> {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    return { ok: false, error: "Razorpay is not configured (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)." };
  }
  if (!Number.isFinite(params.amountPaise) || params.amountPaise < 100) {
    return { ok: false, error: "Invalid amount (minimum ₹1)." };
  }
  if (params.amountPaise > 50_000_000) {
    return { ok: false, error: "Amount exceeds allowed maximum." };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: Math.round(params.amountPaise),
      currency: "INR",
      receipt: params.receipt.slice(0, 40),
      notes: params.notes ?? {},
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    amount?: number;
    currency?: string;
    error?: { description?: string };
  };
  if (!res.ok) {
    return { ok: false, error: data.error?.description ?? `Razorpay error (${res.status})` };
  }
  if (!data.id || data.amount == null) {
    return { ok: false, error: "Invalid Razorpay response" };
  }
  return { ok: true, orderId: data.id, amount: data.amount, currency: data.currency ?? "INR" };
}

export function razorpayVerifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keySecret) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

export function getRazorpayKeyIdPublic(): string | null {
  return process.env.RAZORPAY_KEY_ID?.trim() || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || null;
}

type FetchPaymentResult =
  | { ok: true; orderId: string; amount: number; status: string }
  | { ok: false; error: string };

export async function razorpayFetchPayment(paymentId: string): Promise<FetchPaymentResult> {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    return { ok: false, error: "Razorpay not configured" };
  }
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = (await res.json().catch(() => ({}))) as {
    order_id?: string;
    amount?: number;
    status?: string;
    error?: { description?: string };
  };
  if (!res.ok) {
    return { ok: false, error: data.error?.description ?? `Payment fetch failed (${res.status})` };
  }
  if (!data.order_id || data.amount == null || !data.status) {
    return { ok: false, error: "Invalid payment response" };
  }
  return { ok: true, orderId: data.order_id, amount: data.amount, status: data.status };
}
