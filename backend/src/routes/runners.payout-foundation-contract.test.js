const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const runnersPath = path.resolve("src", "routes", "runners.js");
const schemaPath = path.resolve("prisma", "schema.prisma");
const migrationPath = path.resolve(
  "prisma",
  "migrations",
  "20261105_run_payouts_1a_foundation",
  "migration.sql"
);

const runners = readFileSync(runnersPath, "utf8");
const schema = readFileSync(schemaPath, "utf8");
const migration = readFileSync(migrationPath, "utf8");

test("runner payout foundation exposes runner-only summary and prepare routes", () => {
  assert.match(runners, /router\.get\("\/payouts\/summary", auth/);
  assert.match(runners, /router\.post\("\/payouts\/:runId\/prepare", auth/);
  assert.match(runners, /Only runners can view payout status/);
  assert.match(runners, /Only runners can prepare payouts/);
});

test("payout preparation explicitly reports that no transfer executed", () => {
  assert.match(runners, /transferExecuted:\s*false/);
  assert.doesNotMatch(runners, /stripe\.transfers/);
  assert.doesNotMatch(runners, /transfers\.create/);
});

test("runner payout ledger is one-per-run and idempotency-keyed", () => {
  assert.match(schema, /model RunnerPayout \{/);
  assert.match(schema, /runId\s+Int\s+@unique/);
  assert.match(schema, /idempotencyKey\s+String\s+@unique/);
  assert.match(schema, /providerTransferId\s+String\?\s+@unique/);
});

test("runner stores only Stripe connected account reference and onboarding state", () => {
  assert.match(schema, /stripeConnectedAccountId\s+String\?\s+@unique/);
  assert.match(schema, /payoutOnboardingStatus\s+String\s+@default\("not_started"\)/);
  assert.doesNotMatch(schema, /bankAccount|routingNumber|accountNumber|ssn/i);
});

test("migration is additive and creates duplicate-payout guards", () => {
  assert.match(migration, /ADD COLUMN "stripeConnectedAccountId" TEXT/);
  assert.match(migration, /CREATE TABLE "RunnerPayout"/);
  assert.match(migration, /CREATE UNIQUE INDEX "RunnerPayout_runId_key"/);
  assert.match(migration, /CREATE UNIQUE INDEX "RunnerPayout_idempotencyKey_key"/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/i);
});
