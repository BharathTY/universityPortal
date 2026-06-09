import { SignJWT, jwtVerify } from "jose";
import { getPublicAppOrigin } from "@/lib/public-app-origin";

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(s);
}

/** Short-lived token so a student can open the UPI pay page without logging in. */
export async function createLeadPaymentShareToken(leadId: string): Promise<string> {
  return new SignJWT({ leadId, purpose: "upi-pay" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("3h")
    .sign(getSecret());
}

export async function verifyLeadPaymentShareToken(
  token: string,
  expectedLeadId: string,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.purpose === "upi-pay" && String(payload.leadId) === expectedLeadId;
  } catch {
    return false;
  }
}

export function leadPaymentCompleteUrl(leadId: string, token: string): string {
  const base = getPublicAppOrigin();
  return `${base}/pay/${encodeURIComponent(leadId)}/complete?t=${encodeURIComponent(token)}`;
}

export function leadPaymentPageUrl(leadId: string, token: string): string {
  const base = getPublicAppOrigin();
  return `${base}/pay/${encodeURIComponent(leadId)}?t=${encodeURIComponent(token)}`;
}
