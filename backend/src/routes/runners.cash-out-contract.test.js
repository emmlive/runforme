const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const runners = readFileSync(path.resolve("src", "routes", "runners.js"), "utf8");
const cashOut = readFileSync(path.resolve("src", "services", "runnerCashOut.js"), "utf8");

test("cash-out endpoint is runner-only and keyed by run id", () => {
  assert.match(runners, /router\.post\("\/payouts\/:runId\/cash-out", auth/);
  assert.match(runners, /Only runners can cash out payouts/);
});

test("cash-out transfer is tied to captured PaymentIntent source charge", () => {
  assert.match(cashOut, /stripe\.paymentIntents\.retrieve/);
  assert.match(cashOut, /latest_charge/);
  assert.match(cashOut, /source_transaction:\s*sourceChargeId/);
});

test("cash-out uses stable Stripe transfer idempotency", () => {
  assert.match(cashOut, /idempotencyKey:\s*`\$\{payout\.idempotencyKey\}:transfer`/);
});

test("cash-out persists provider transfer id and transferred state", () => {
  assert.match(cashOut, /providerTransferId:\s*transfer\.id/);
  assert.match(cashOut, /status:\s*"transferred"/);
  assert.match(cashOut, /payoutStatus:\s*"transferred"/);
});

test("cash-out does not expose arbitrary destination or amount from request body", () => {
  assert.doesNotMatch(runners, /req\.body\.amount|req\.body\.destination/);
});
