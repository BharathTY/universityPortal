/**
 * QSpiders webhook parsing tests — no DB.
 * Run: npx tsx tests/qspiders-webhook.test.ts
 */
import assert from "node:assert";
import {
  normalizeWebhookEventType,
  resolveWebhookEventType,
  resolveWebhookDeliveryId,
  webhookActionFromEventType,
} from "../src/lib/qspiders-webhook/types";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log("QSpiders webhook — logic tests\n");

test("normalizes university.updated", () => {
  assert.strictEqual(normalizeWebhookEventType("university.updated"), "university.updated");
});

test("normalizes qualification type aliases", () => {
  assert.strictEqual(normalizeWebhookEventType("qualification_types.updated"), "qualification_type.updated");
});

test("normalizes specialisation British spelling", () => {
  assert.strictEqual(normalizeWebhookEventType("specialisation.created"), "specialization.created");
});

test("resolves envelope type field", () => {
  assert.strictEqual(
    resolveWebhookEventType({ id: "1", type: "degree_type.updated", data: {} }),
    "degree_type.updated",
  );
});

test("resolves entity + action fallback", () => {
  assert.strictEqual(
    resolveWebhookEventType({ id: "2", entity: "stream", action: "updated", data: {} }),
    "stream.updated",
  );
});

test("delivery id from id or eventId", () => {
  assert.strictEqual(resolveWebhookDeliveryId({ id: "evt_a" }), "evt_a");
  assert.strictEqual(resolveWebhookDeliveryId({ eventId: "evt_b" }), "evt_b");
});

test("action from event suffix", () => {
  assert.strictEqual(webhookActionFromEventType("university.created"), "create");
  assert.strictEqual(webhookActionFromEventType("stream.deleted"), "delete");
  assert.strictEqual(webhookActionFromEventType("degree_type.updated"), "update");
});

console.log("\nAll webhook logic tests passed.");
