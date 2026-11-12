const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "runners.js"),
  "utf8"
);

test("runner payout summary returns bank payout lifecycle", () => {
  assert.match(
    source,
    /prisma\.runnerBankPayout\.findMany\s*\(/
  );

  assert.match(
    source,
    /where:\s*\{\s*runnerId:\s*req\.user\.id\s*\}/
  );

  assert.match(
    source,
    /bankPayouts:\s*bankPayoutLedger/
  );
});

test("runner payout summary exposes read-only bank payout fields", () => {
  for (const field of [
    "providerPayoutId",
    "amountMinor",
    "currency",
    "status",
    "arrivalDate",
    "failureCode",
  ]) {
    assert.match(
      source,
      new RegExp(field)
    );
  }
});

test("runner payout summary contains no bank payout execution path", () => {
  assert.doesNotMatch(
    source,
    /runnerBankPayout\.create\s*\(/
  );

  assert.doesNotMatch(
    source,
    /stripe\.payouts\.create\s*\(/
  );
});
