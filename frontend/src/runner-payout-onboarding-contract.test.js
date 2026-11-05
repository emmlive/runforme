import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const runnerPath = path.resolve("src", "RunnerDashboard.jsx");
const source = readFileSync(runnerPath, "utf8");

test("runner Earnings exposes payout onboarding status and start flow", () => {
  assert.match(source, /apiRequest\("\/api\/runners\/payouts\/onboarding\/status"\)/);
  assert.match(source, /"\/api\/runners\/payouts\/onboarding\/start"/);
  assert.match(source, /Set up payouts/);
  assert.match(source, /Continue payout setup/);
});

test("runner onboarding redirects only to backend-provided onboarding URL", () => {
  assert.match(source, /window\.location\.assign\(res\.onboardingUrl\)/);
  assert.doesNotMatch(source, /stripe\.com\/.*onboard/);
});

test("runner Earnings explains bank details are not stored by RUNFORME", () => {
  assert.match(source, /RUNFORME does not store your bank account information\./);
});

test("RUN-PAYOUTS-1B does not expose cash-out execution", () => {
  assert.doesNotMatch(source, /Cash out/);
  assert.doesNotMatch(source, /\/payouts\/.*\/execute/);
  assert.doesNotMatch(source, /\/payouts\/.*\/cash/);
});
