const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readRoute(name) {
  return fs.readFileSync(
    path.join(__dirname, name),
    "utf8"
  );
}

test("runs route imports and invokes payment runtime guard before Stripe use", () => {
  const source = readRoute("runs.js");

  assert.match(
    source,
    /require\s*\(\s*["']\.\.\/services\/paymentRuntimeGuard["']\s*\)/,
    "runs route must import payment runtime guard"
  );

  assert.match(
    source,
    /assertPaymentRuntimeAuthorized\s*\(/,
    "runs route must invoke payment runtime guard"
  );

  const guardCall = source.indexOf(
    "assertPaymentRuntimeAuthorized("
  );

  const providerConstruction = source.search(
    /require\s*\(\s*["']stripe["']\s*\)\s*\(/
  );

  assert.ok(
    guardCall >= 0,
    "runs route guard invocation must be present"
  );

  if (providerConstruction >= 0) {
    assert.ok(
      guardCall < providerConstruction,
      "runs route must authorize runtime before Stripe client construction"
    );
  }

  assert.match(
    source,
    /RUNFORME_LIVE_PAYMENTS_AUTHORIZED/,
    "runs route must use explicit live-payment authorization flag"
  );
});

test("webhook route imports and invokes payment runtime guard before Stripe construction", () => {
  const source = readRoute("webhooks.js");

  assert.match(
    source,
    /require\s*\(\s*["']\.\.\/services\/paymentRuntimeGuard["']\s*\)/,
    "webhook route must import payment runtime guard"
  );

  assert.match(
    source,
    /assertPaymentRuntimeAuthorized\s*\(/,
    "webhook route must invoke payment runtime guard"
  );

  const guardCall = source.indexOf(
    "assertPaymentRuntimeAuthorized("
  );

  const providerConstruction = source.search(
    /require\s*\(\s*["']stripe["']\s*\)\s*\(/
  );

  assert.ok(
    guardCall >= 0,
    "webhook guard invocation must be present"
  );

  assert.ok(
    providerConstruction >= 0,
    "webhook Stripe client construction must remain present"
  );

  assert.ok(
    guardCall < providerConstruction,
    "webhook runtime authorization must occur before Stripe client construction"
  );

  assert.match(
    source,
    /RUNFORME_LIVE_PAYMENTS_AUTHORIZED/,
    "webhook route must use explicit live-payment authorization flag"
  );
});
