import type { NextConfig } from "next";

/** Hostnames or origins for dev HMR (see `allowedDevOrigins` in Next.js docs). */
function parseAllowedDevOriginsFromEnv(): string[] {
  const raw = process.env.ALLOWED_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const out: string[] = [];
  for (const entry of raw) {
    out.push(entry);
    try {
      const u = new URL(entry);
      if (u.hostname) out.push(u.hostname);
      if (u.host) out.push(u.host);
    } catch {
      /* already a bare hostname */
    }
  }
  return [...new Set(out)];
}

const nextConfig: NextConfig = {
  // Prisma must run from Node with the generated client; bundling can strip model delegates (e.g. prisma.batch).
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Allow HMR / dev assets when opening the app by LAN or public IP (not only localhost).
  ...(process.env.NODE_ENV === "development"
    ? {
        allowedDevOrigins: [
          ...new Set([
            "localhost",
            "127.0.0.1",
            "103.182.211.219",
            "103.182.211.219:7777",
            "http://localhost:7777",
            "http://127.0.0.1:7777",
            "http://103.182.211.219:7777",
            ...parseAllowedDevOriginsFromEnv(),
          ]),
        ],
      }
    : {}),
};

export default nextConfig;
