/**
 * Canonical public origin for server-generated absolute URLs (invite emails, etc.).
 *
 * Resolution order:
 * 1. Prefer a hostname-based URL from `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` / `VERCEL_URL`
 *    (raw IP hosts are skipped when a better candidate exists — they cause
 *    "This site can't be reached" for consultants outside the server network).
 * 2. Fall back to the first configured value even if it is an IP.
 * 3. Localhost with PORT (default 7777) when nothing is configured.
 *
 * Always set `APP_BASE_URL=https://portal.qspiderseduversity.com` (or your public
 * domain) on the machine that sends activation emails, then restart the app.
 */
function stripEnvQuotes(raw: string): string {
  const t = raw.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
}

function normalizeOrigin(raw: string): string | null {
  const cleaned = stripEnvQuotes(raw);
  if (!cleaned) return null;
  const withProto =
    cleaned.startsWith("http://") || cleaned.startsWith("https://")
      ? cleaned
      : `https://${cleaned}`;
  try {
    const url = new URL(withProto);
    return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
  } catch {
    return withProto.replace(/\/+$/, "");
  }
}

function isIpHostname(hostname: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.includes(":") && !hostname.includes(".")) return true; // IPv6-ish
  return false;
}

function originUsesIpHost(origin: string): boolean {
  try {
    return isIpHostname(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export function getPublicAppOrigin(): string {
  const candidates = [
    process.env.APP_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL,
  ]
    .map((v) => (v ? normalizeOrigin(v) : null))
    .filter((v): v is string => Boolean(v));

  const hostnameOrigin = candidates.find((o) => !originUsesIpHost(o));
  if (hostnameOrigin) return hostnameOrigin;

  if (candidates[0]) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[public-app-origin] Using IP-based origin ${candidates[0]} for invite links. ` +
          "Set APP_BASE_URL to a public hostname (e.g. https://portal.qspiderseduversity.com) " +
          'so Activate Account links do not show "This site can\'t be reached".',
      );
    }
    return candidates[0];
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[public-app-origin] APP_BASE_URL and NEXT_PUBLIC_APP_URL are unset; invite links will use localhost. Set APP_BASE_URL in production.",
    );
  }

  const port = process.env.PORT?.trim() || "7777";
  return `http://localhost:${port}`.replace(/\/+$/, "");
}
