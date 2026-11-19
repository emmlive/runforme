import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const schema = readFileSync(
  path.resolve("prisma", "schema.prisma"),
  "utf8"
);

test("schema defines additive runner Pulse state", () => {
  assert.match(schema, /model\s+RunnerPulseState\s*\{/);
  assert.match(schema, /runnerId\s+Int\s+@unique/);
  assert.match(schema, /consecutiveMisses\s+Int\s+@default\(0\)/);
  assert.match(schema, /lastPromptedAt\s+DateTime\?/);
  assert.match(schema, /lastMissedRunId\s+Int\?/);
  assert.match(schema, /runner\s+User\s+@relation\(fields:\s*\[runnerId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
});

test("schema defines categorical Pulse feedback events", () => {
  assert.match(schema, /model\s+RunnerPulseEvent\s*\{/);
  assert.match(schema, /runnerId\s+Int/);
  assert.match(schema, /trigger\s+String/);
  assert.match(schema, /missCount\s+Int/);
  assert.match(schema, /reason\s+String\?/);
  assert.match(schema, /dismissed\s+Boolean\s+@default\(false\)/);
  assert.match(schema, /respondedAt\s+DateTime\?/);
  assert.match(schema, /createdAt\s+DateTime\s+@default\(now\(\)\)/);
});

test("User owns Pulse state and events without touching payout fields", () => {
  assert.match(schema, /pulseState\s+RunnerPulseState\?/);
  assert.match(schema, /pulseEvents\s+RunnerPulseEvent\[\]/);
  assert.match(schema, /runnerPayouts\s+RunnerPayout\[\]/);
  assert.match(schema, /runnerBankPayouts\s+RunnerBankPayout\[\]/);
});
