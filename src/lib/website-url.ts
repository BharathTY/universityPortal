/** Known catalog URLs whose www subdomain is blocked (returns 403). */
const BLOCKED_WWW_HOSTS = new Set(["www.vtu.ac.in"]);

/**
 * Build a safe external href for a university website value from the catalog or form.
 */
export function resolveWebsiteHref(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  let href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    if (BLOCKED_WWW_HOSTS.has(host)) {
      url.hostname = host.slice(4);
      href = url.toString();
    }
    return href;
  } catch {
    return href;
  }
}
