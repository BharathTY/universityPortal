/**
 * Migrates legacy AdmissionLeadStatus enum values to PRD statuses before schema push.
 * Run: npx tsx scripts/migrate-lead-status-enum.ts
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const envPath = path.join(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1]!.trim()]) {
      process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
}

const prisma = new PrismaClient();

const MAP: Record<string, string> = {
  NEW: "NEW_LEAD",
  CONTACTED: "INTERESTED",
  QUALIFIED: "INTERESTED",
  ADMITTED: "ENROLLED",
  REJECTED: "NOT_INTERESTED",
  WITHDRAWN: "NOT_INTERESTED",
};

function mapStatus(s: string): string {
  return MAP[s] ?? s;
}

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AdmissionLead" ALTER COLUMN "admissionStatus" TYPE TEXT USING "admissionStatus"::TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AdmissionLeadStatusHistory" ALTER COLUMN "fromStatus" TYPE TEXT USING "fromStatus"::TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AdmissionLeadStatusHistory" ALTER COLUMN "toStatus" TYPE TEXT USING "toStatus"::TEXT;
  `);

  const leads = await prisma.$queryRawUnsafe<{ id: string; admissionStatus: string }[]>(
    `SELECT id, "admissionStatus" FROM "AdmissionLead"`,
  );
  for (const row of leads) {
    const next = mapStatus(row.admissionStatus);
    if (next !== row.admissionStatus) {
      await prisma.$executeRawUnsafe(
        `UPDATE "AdmissionLead" SET "admissionStatus" = $1 WHERE id = $2`,
        next,
        row.id,
      );
    }
  }

  const history = await prisma.$queryRawUnsafe<
    { id: string; fromStatus: string; toStatus: string }[]
  >(`SELECT id, "fromStatus", "toStatus" FROM "AdmissionLeadStatusHistory"`);

  for (const row of history) {
    const from = mapStatus(row.fromStatus);
    const to = mapStatus(row.toStatus);
    if (from !== row.fromStatus || to !== row.toStatus) {
      await prisma.$executeRawUnsafe(
        `UPDATE "AdmissionLeadStatusHistory" SET "fromStatus" = $1, "toStatus" = $2 WHERE id = $3`,
        from,
        to,
        row.id,
      );
    }
  }

  await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "AdmissionLeadStatus" CASCADE;`);

  await prisma.$executeRawUnsafe(`
    CREATE TYPE "AdmissionLeadStatus" AS ENUM (
      'NEW_LEAD', 'INTERESTED', 'NOT_INTERESTED', 'CALL_BACK', 'READY_TO_PAY',
      'PAYMENT_DONE', 'IN_FUTURE', 'RNR', 'SWITCH_OFF', 'WRONG_NUMBER',
      'ENROLLED', 'CAMPUS_VISIT_DONE', 'SENT_TO_CAMPUS'
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AdmissionLead"
    ALTER COLUMN "admissionStatus" TYPE "AdmissionLeadStatus"
    USING "admissionStatus"::"AdmissionLeadStatus";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AdmissionLead"
    ALTER COLUMN "admissionStatus" SET DEFAULT 'NEW_LEAD';
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AdmissionLeadStatusHistory"
    ALTER COLUMN "fromStatus" TYPE "AdmissionLeadStatus"
    USING "fromStatus"::"AdmissionLeadStatus";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AdmissionLeadStatusHistory"
    ALTER COLUMN "toStatus" TYPE "AdmissionLeadStatus"
    USING "toStatus"::"AdmissionLeadStatus";
  `);

  console.log("Lead status enum migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
