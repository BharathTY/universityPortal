/**
 * Upsert master university catalog from prisma/data/master-universities.json into the database.
 * Run after: npm run import:universities
 *
 * Usage: npx tsx scripts/sync-master-universities-to-db.ts
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type MasterUniRecord = {
  externalId: string;
  name: string;
  shortname?: string;
  state: string;
  stateCode?: string;
  district: string;
  address?: string;
  city?: string;
  pincode?: string;
  website?: string;
  universityType: "PRIVATE" | "DEEMED" | "STATE_GOVT";
  priority?: boolean;
};

async function main() {
  const jsonPath = path.join(process.cwd(), "prisma", "data", "master-universities.json");
  if (!existsSync(jsonPath)) {
    console.error(`Missing ${jsonPath}. Run: npm run import:universities`);
    process.exit(1);
  }

  const records = JSON.parse(readFileSync(jsonPath, "utf8")) as MasterUniRecord[];
  if (records.length === 0) {
    console.error("No records in master-universities.json");
    process.exit(1);
  }

  let upserted = 0;
  const batchSize = 50;
  const externalIds = new Set(records.map((r) => r.externalId));
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await prisma.$transaction(
      batch.map((r) =>
        prisma.masterUniversity.upsert({
          where: { externalId: r.externalId },
          create: {
            externalId: r.externalId,
            name: r.name,
            shortname: r.shortname ?? null,
            state: r.state,
            stateCode: r.stateCode ?? null,
            district: r.district,
            address: r.address ?? null,
            city: r.city ?? null,
            pincode: r.pincode ?? null,
            website: r.website ?? null,
            universityType: r.universityType,
            priority: r.priority ?? false,
          },
          update: {
            name: r.name,
            shortname: r.shortname ?? null,
            state: r.state,
            stateCode: r.stateCode ?? null,
            district: r.district,
            address: r.address ?? null,
            city: r.city ?? null,
            pincode: r.pincode ?? null,
            website: r.website ?? null,
            universityType: r.universityType,
            priority: r.priority ?? false,
          },
        }),
      ),
    );
    upserted += batch.length;
    if (upserted % 200 === 0 || upserted === records.length) {
      console.log(`Synced ${upserted}/${records.length}…`);
    }
  }

  const removed = await prisma.masterUniversity.deleteMany({
    where: { externalId: { notIn: [...externalIds] } },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} stale master university record(s) not in catalog.`);
  }

  const total = await prisma.masterUniversity.count();
  console.log(`Done. ${records.length} records upserted; ${total} total in MasterUniversity table.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
