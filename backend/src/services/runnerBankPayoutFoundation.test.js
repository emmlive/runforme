const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schema = fs.readFileSync(
  path.join(__dirname, "..", "..", "prisma", "schema.prisma"),
  "utf8"
);

const migration = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "..",
    "prisma",
    "migrations",
    "20261111_run_payouts_1d_b_bank_payout_lifecycle",
    "migration.sql"
  ),
  "utf8"
);

test("RunnerBankPayout is additive and keyed by provider payout id", () => {
  assert.match(schema, /model\s+RunnerBankPayout\s*\{/);
  assert.match(schema, /providerPayoutId\s+String\s+@unique/);
  assert.match(schema, /amountMinor\s+Int/);
  assert.match(schema, /runnerId\s+Int/);
  assert.match(schema, /status\s+String/);
});

test("bank payout migration creates unique provider payout guard", () => {
  assert.match(
    migration,
    /CREATE\s+UNIQUE\s+INDEX\s+"RunnerBankPayout_providerPayoutId_key"/i
  );
  assert.match(
    migration,
    /FOREIGN\s+KEY\s+\("runnerId"\)\s+REFERENCES\s+"User"\("id"\)/i
  );
});

test("1D-B migration does not alter RunnerPayout transfer ledger", () => {
  assert.doesNotMatch(
    migration,
    /ALTER\s+TABLE\s+"RunnerPayout"/i
  );
});

test("1D-B schema and migration contain no Stripe payout execution API", () => {
  assert.doesNotMatch(schema, /payouts\.create\s*\(/);
  assert.doesNotMatch(migration, /payouts\.create\s*\(/);
});
