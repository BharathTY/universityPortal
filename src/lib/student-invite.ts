import { randomBytes } from "crypto";
import { getPublicAppOrigin } from "@/lib/public-app-origin";

/** Opaque token for ?token= in invite emails (stored on User.inviteToken). */
export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

/** Password setup link emailed to consultants and SPOCs on account creation. */
export function buildAccountActivationUrl(token: string): string {
  return `${getPublicAppOrigin()}/activate-account?token=${encodeURIComponent(token)}`;
}

/** @deprecated Use getPublicAppOrigin from @/lib/public-app-origin — alias kept for existing imports */
export function getAppOrigin(): string {
  return getPublicAppOrigin();
}
