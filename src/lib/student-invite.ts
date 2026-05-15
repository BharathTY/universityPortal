import { randomBytes } from "crypto";
import { getPublicAppOrigin } from "@/lib/public-app-origin";

/** Opaque token for ?token= in invite emails (stored on User.inviteToken). */
export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

/** @deprecated Use getPublicAppOrigin from @/lib/public-app-origin — alias kept for existing imports */
export function getAppOrigin(): string {
  return getPublicAppOrigin();
}
