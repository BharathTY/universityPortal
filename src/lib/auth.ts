import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const COOKIE_NAME = "UP_SESSION";

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
