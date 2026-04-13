import { randomBytes } from "crypto";

/** Opaque token for ?token= in invite emails (stored on User.inviteToken). */
export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function getAppOrigin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (url) {
    return url.startsWith("http") ? url : `https://${url}`;
  }
  return "http://localhost:3000";
}
