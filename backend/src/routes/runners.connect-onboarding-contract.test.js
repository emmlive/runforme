const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const runnersPath = path.resolve("src", "routes", "runners.js");
const onboardingPath = path.resolve("src", "services", "runnerConnectOnboarding.js");

const runners = readFileSync(runnersPath, "utf8");
const onboarding = readFileSync(onboardingPath, "utf8");

test("runner Connect onboarding exposes runner-only start and status routes", () => {
  assert.match(runners, /router\.post\("\/payouts\/onboarding\/start", auth/);
  assert.match(runners, /router\.get\("\/payouts\/onboarding\/status", auth/);
  assert.match(runners, /Only runners can set up payouts/);
  assert.match(runners, /Only runners can view payout onboarding status/);
});

test("onboarding return and refresh URLs are server-controlled", () => {
  assert.match(runners, /process\.env\.FRONTEND_URL/);
  assert.match(runners, /payout_onboarding=return/);
  assert.match(runners, /payout_onboarding=refresh/);
  assert.doesNotMatch(runners, /req\.body\.returnUrl|req\.body\.refreshUrl/);
});

test("Connect onboarding requests transfers only with controller properties", () => {
  assert.match(onboarding, /capabilities:\s*\{\s*transfers:/);
  assert.doesNotMatch(onboarding, /card_payments/);
  assert.match(onboarding, /stripe_dashboard:\s*\{\s*type:\s*"express"/);
  assert.match(onboarding, /fees:\s*\{\s*payer:\s*"application"/);
  assert.match(onboarding, /losses:\s*\{\s*payments:\s*"application"/);
  assert.match(onboarding, /requirement_collection:\s*"stripe"/);
  assert.doesNotMatch(onboarding, /stripe\.accounts\.create\(\{[\s\S]*?^\s{4}type:\s*["\']express["\']/m);
});

test("Connect onboarding has no transfer execution path", () => {
  assert.doesNotMatch(onboarding, /stripe\.transfers/);
  assert.doesNotMatch(onboarding, /transfers\.create/);
  assert.doesNotMatch(runners, /stripe\.transfers/);
  assert.doesNotMatch(runners, /transfers\.create/);
});

test("ready onboarding requires active transfer capability", () => {
  assert.match(onboarding, /account\.capabilities\?\.transfers\s*===\s*"active"/);
  assert.match(onboarding, /account\.details_submitted\s*===\s*true/);
});

test("onboarding return origin must be allowlisted before reuse", () => {
  assert.match(runners, /getAllowedOrigins/);
  assert.match(runners, /req\.get\("origin"\)/);
  assert.match(runners, /allowedOrigins\.has\(requestOrigin\)/);
  assert.doesNotMatch(runners, /req\.body\.origin|req\.query\.origin/);
});
