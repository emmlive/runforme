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

test("RUN-PAYOUTS-1B onboarding does not execute cash-out implicitly", () => {
  assert.doesNotMatch(
    source,
    /\/api\/runners\/payouts\/onboarding\/start[^\n]*cash-out/
  );
  assert.doesNotMatch(
    source,
    /\/api\/runners\/payouts\/onboarding\/status[^\n]*cash-out/
  );
});

test("runner Earnings refreshes payout onboarding and payout summary when opened", () => {
  assert.match(
    source,
    /if \(id === "earnings"\) \{\s*fetchPayoutOnboardingStatus\(\);\s*\}/
  );
  assert.match(
    source,
    /if \(mobileSection === "earnings"\) \{\s*fetchPayoutOnboardingStatus\(\);\s*fetchPayoutSummary\(\);\s*\}/
  );
});
