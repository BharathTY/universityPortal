import { runConsultantStudentPrefillE2e } from "./e2e-consultant-student-prefill";
import { runPortalFlowE2e } from "./e2e-portal-flows";

async function main() {
  const base = process.env.E2E_BASE_URL ?? "http://localhost:7777";
  const portal = await runPortalFlowE2e(base);
  const prefill = await runConsultantStudentPrefillE2e(base);
  console.log("\n——");
  console.log(`Portal: ${portal.passed} passed, ${portal.failed} failed`);
  console.log(`Prefill: ${prefill.passed} passed, ${prefill.failed} failed`);
  process.exit(portal.failed + prefill.failed > 0 ? 1 : 0);
}

void main();
