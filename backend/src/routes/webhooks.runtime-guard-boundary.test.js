const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webhookPath = path.join(__dirname, "webhooks.js");
const source = fs.readFileSync(webhookPath, "utf8");

test("webhook catches payment runtime authorization failure before Stripe construction", () => {
  const guardCall = source.indexOf(
    "assertPaymentRuntimeAuthorized("
  );

  const runtimeFailureLog = source.indexOf(
    "Stripe webhook payment runtime authorization failed:"
  );

  const unavailableResponse = source.indexOf(
    'error: "Payment runtime unavailable"'
  );

  const providerConstruction = source.search(
    /require\s*\(\s*["']stripe["']\s*\)\s*\(/
  );

  assert.ok(guardCall >= 0);
  assert.ok(runtimeFailureLog > guardCall);
  assert.ok(unavailableResponse > runtimeFailureLog);
  assert.ok(providerConstruction > unavailableResponse);

  assert.match(
    source,
    /return\s+res\.status\(503\)\.json\s*\(/
  );
});

test("webhook runtime guard remains before Stripe client construction", () => {
  const guardCall = source.indexOf(
    "assertPaymentRuntimeAuthorized("
  );

  const providerConstruction = source.search(
    /require\s*\(\s*["']stripe["']\s*\)\s*\(/
  );

  assert.ok(guardCall >= 0);
  assert.ok(providerConstruction >= 0);
  assert.ok(guardCall < providerConstruction);
});