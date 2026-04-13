import type { SessionPayload } from "./auth";

export function hasRole(session: SessionPayload | null, slug: string): boolean {
  if (!session) return false;
  return session.roles.includes(slug);
}

export function assertRole(session: SessionPayload | null, slug: string): void {
  if (!hasRole(session, slug)) {
    throw new Error(`Forbidden: requires role ${slug}`);
  }
}
