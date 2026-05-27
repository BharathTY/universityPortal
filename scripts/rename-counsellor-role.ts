/**
 * One-off: set display name "Consultant SPOC" for legacy counsellor + consultant_spoc roles.
 * Usage: npx tsx scripts/rename-counsellor-role.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.role.updateMany({
    where: { slug: { in: ["counsellor", "consultant_spoc"] } },
    data: { name: "Consultant SPOC" },
  });
  console.log(`Updated ${result.count} role row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
