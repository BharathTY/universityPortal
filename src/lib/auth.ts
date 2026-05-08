import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const COOKIE_NAME = "UP_SESSION";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/**
 * Browser will reject `Secure` cookies on plain HTTP. Production defaults to `secure: true`.
 * For HTTP deployments (e.g. http://server:7777), set `COOKIE_SECURE=false` in `.env`.
 */
export function buildSessionCookieOptions(maxAgeSec: number): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  const secure =
    process.env.COOKIE_SECURE === "true"
      ? true
      : process.env.COOKIE_SECURE === "false"
        ? false
        : process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  };
}

export const defaultSessionMaxAgeSec = SESSION_MAX_AGE_SEC;

export type SessionPayload = {
  sub: string;
  email: string;
  roles: string[];
  universityId: string | null;
  studentOfId: string | null;
};

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(s);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    roles: payload.roles,
    universityId: payload.universityId,
    studentOfId: payload.studentOfId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  const rolesRaw = payload.roles;
  const uni = payload.universityId;
  const st = payload.studentOfId;
  return {
    sub: String(payload.sub),
    email: String(payload.email ?? ""),
    roles: Array.isArray(rolesRaw) ? rolesRaw.map(String) : [],
    universityId: uni === null || uni === undefined ? null : String(uni),
    studentOfId: st === null || st === undefined ? null : String(st),
  };
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
