import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(path.resolve("src", "RunnerDashboard.jsx"), "utf8");

test("runner Earnings exposes guarded cash-out action", () => {
  assert.match(source, /\/api\/runners\/payouts\/\$\{run\.id\}\/cash-out/);
  assert.match(source, /Cash out \$/);
  assert.match(source, /payoutOnboarding\.status === "ready"/);
  assert.match(source, /run\.payoutStatus === "ready_for_payout"/);
});

test("cash-out updates local run to transferred and hides repeat action", () => {
  assert.match(source, /payoutStatus:\s*"transferred"/);
  assert.match(source, /run\.payoutStatus === "transferred"/);
  assert.match(source, /Transfer sent/);
});

test("cash-out button disables while transfer request is active", () => {
  assert.match(source, /disabled=\{cashOutRunId === run\.id\}/);
  assert.match(source, /Cashing out\.\.\./);
});
