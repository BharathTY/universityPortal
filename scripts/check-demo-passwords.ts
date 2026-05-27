import { PrismaClient } from "@prisma/client";

async function main() {
  const emails = [
    "master@university.local",
    "consultant@university.local",
    "counsellor@university.local",
    "student@university.local",
    "admin@university.local",
    "university@university.local",
  ];

  const prisma = new PrismaClient();
  const rows = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, passwordHash: true },
  });
  for (const u of rows) {
    console.log(`${u.email}\t${u.passwordHash ? "HAS_PASSWORD" : "NO_PASSWORD"}`);
  }
  await prisma.$disconnect();
}

void main();
