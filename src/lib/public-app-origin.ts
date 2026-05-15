/**
 * Canonical public origin for server-generated absolute URLs (invite emails, etc.).
 *
 * Resolution order:
 * 1. `APP_BASE_URL` — preferred in production (server-only; not exposed to the browser).
 * 2. `NEXT_PUBLIC_APP_URL` — same value often duplicated for client + server convenience.
 * 3. `VERCEL_URL` — host only; https is assumed (Vercel convention).
 *
 * Always set `APP_BASE_URL` or `NEXT_PUBLIC_APP_URL` in deployed environments so links
 * never fall back to localhost.
 */
export function getPublicAppOrigin(): string {
  const raw =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  if (raw) {
    const withProto =
      raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    return withProto.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[public-app-origin] APP_BASE_URL and NEXT_PUBLIC_APP_URL are unset; invite links will use localhost. Set APP_BASE_URL in production.",
    );
  }

  const port = process.env.PORT?.trim() || "7777";
  return `http://localhost:${port}`.replace(/\/+$/, "");
}
