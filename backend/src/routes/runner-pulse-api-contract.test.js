const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = readFileSync(
  path.resolve("src", "routes", "runners.js"),
  "utf8"
);

test("runner Pulse eligibility endpoint is authenticated and runner-only", () => {
  assert.match(
    source,
    /router\.get\(["']\/pulse["'],\s*auth,\s*async\s*\(req,\s*res\)/
  );
  assert.match(
    source,
    /req\.user\.role\s*!==\s*["']runner["']/
  );
  assert.match(
    source,
    /status:\s*\{\s*in:\s*\[["']assigned["'],\s*["']arrived["'],\s*["']in_progress["']\]\s*\}/
  );
  assert.match(
    source,
    /pulseService\.getPulseEligibility\(\{[\s\S]{0,240}runnerId:\s*req\.user\.id[\s\S]{0,240}hasActiveRun/
  );
});

test("runner Pulse response endpoint accepts only the authenticated runner response", () => {
  assert.match(
    source,
    /router\.post\(["']\/pulse\/response["'],\s*auth,\s*async\s*\(req,\s*res\)/
  );
  assert.match(
    source,
    /pulseService\.recordPulseResponse\(\{[\s\S]{0,240}runnerId:\s*req\.user\.id[\s\S]{0,240}reason[\s\S]{0,240}dismissed/
  );
});

test("Pulse routes do not mutate payment payout or account status", () => {
  const start = source.indexOf('router.get("/pulse"');
  const end = source.indexOf(
    "/* ============================\n   RUNNER STRIPE CONNECT ONBOARDING",
    start
  );

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const pulseSection = source.slice(start, end);

  assert.doesNotMatch(
    pulseSection,
    /paymentStatus|payoutStatus|accountStatus|stripeConnectedAccountId/
  );
});
