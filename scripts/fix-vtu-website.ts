import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.masterUniversity.updateMany({
    where: { website: "https://www.vtu.ac.in" },
    data: { website: "https://vtu.ac.in" },
  });
  console.log(`Updated ${result.count} master university website(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
