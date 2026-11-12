const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "webhooks.js"),
  "utf8"
);

test("dedicated Stripe Connect webhook route exists", () => {
  assert.match(
    source,
    /router\.post\s*\(\s*["']\/stripe-connect["']/
  );
});

test("Connect webhook uses separate signing secret", () => {
  assert.match(
    source,
    /STRIPE_CONNECT_WEBHOOK_SECRET/
  );
  assert.match(
    source,
    /constructEvent\s*\(/
  );
});

test("Connect webhook fails closed when signing secret is missing", () => {
  assert.match(
    source,
    /Stripe Connect webhook secret is not configured/
  );
  assert.match(
    source,
    /Connect webhook unavailable/
  );
});

test("existing platform webhook secret remains present", () => {
  assert.match(
    source,
    /process\.env\.STRIPE_WEBHOOK_SECRET/
  );
});

test("Connect webhook delegates to canonical reconciler", () => {
  const routeStart = source.indexOf('"/stripe-connect"');
  assert.notEqual(routeStart, -1);
  const connectRoute = source.slice(routeStart);
  assert.match(
    connectRoute,
    /reconcileStripeEvent\s*\(\s*\{/
  );
});
