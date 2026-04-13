import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma must run from Node with the generated client; bundling can strip model delegates (e.g. prisma.batch).
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
