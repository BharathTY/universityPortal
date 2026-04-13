import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getOrCreate(): PrismaClient {
  const existing = globalForPrisma.prisma;
  const hasBatch =
    existing &&
    typeof (existing as unknown as { batch?: { findMany?: unknown } }).batch?.findMany === "function";

  if (existing && hasBatch) {
    return existing;
  }

  if (existing) {
    void existing.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }

  const client = createClient();
  globalForPrisma.prisma = client;
  return client;
}

export const prisma: PrismaClient = getOrCreate();
