/**
 * Smoke test: brochure token → admission lead (same path as POST /api/public/batch-referral).
 * Run: npx tsx scripts/smoke-brochure-referral.ts
 * Requires DATABASE_URL and a batch with an owner linked to a university (e.g. after seed).
 */
import { createAdmissionLeadFromBrochureToken } from "../src/lib/brochure-referral-lead";
import { ensureBatchLeadPunchToken } from "../src/lib/batch-lead-punch-token";
import { prisma } from "../src/lib/prisma";

async function main() {
  const batch = await prisma.batch.findFirst({
    where: { ownerId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, ownerId: true, leadPunchToken: true },
  });
  if (!batch?.ownerId) {
    console.error("FAIL: No batch with owner in database.");
    process.exit(1);
  }

  const token = await ensureBatchLeadPunchToken(batch.id);
  console.log("Batch:", batch.title, "| token length:", token.length);

  const email = `smoke.brochure.${Date.now()}@example.com`;
  const result = await createAdmissionLeadFromBrochureToken(token, {
    firstName: "Smoke",
    lastName: "Brochure",
    email,
    mobile: "98000009999",
    referralFirstName: "Ref",
    referralLastName: "One",
  });

  if (!result.ok) {
    console.error("FAIL:", result.status, result.error);
    process.exit(1);
  }

  const row = await prisma.admissionLead.findUnique({
    where: { id: result.leadId },
    select: {
      email: true,
      firstName: true,
      specialization: true,
      createdByUserId: true,
      batchId: true,
      assignedPartnerDisplayName: true,
    },
  });
  if (!row || row.email !== email.toLowerCase()) {
    console.error("FAIL: Lead row missing or email mismatch");
    process.exit(1);
  }
  if (row.createdByUserId !== batch.ownerId) {
    console.error("FAIL: createdByUserId should be batch owner");
    process.exit(1);
  }
  if (row.batchId !== batch.id) {
    console.error("FAIL: batchId should be set to brochure batch");
    process.exit(1);
  }
  if (!row.assignedPartnerDisplayName?.trim()) {
    console.error("FAIL: assignedPartnerDisplayName should be set");
    process.exit(1);
  }

  await prisma.admissionLead.delete({ where: { id: result.leadId } });
  console.log("OK: Public brochure path created lead", result.leadId, "then removed.");
  process.exit(0);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
