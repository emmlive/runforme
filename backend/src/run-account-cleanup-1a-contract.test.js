const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schema = fs.readFileSync(
  path.resolve("prisma", "schema.prisma"),
  "utf8"
);
const authRoute = fs.readFileSync(
  path.resolve("src", "routes", "auth.js"),
  "utf8"
);
const authMiddleware = fs.readFileSync(
  path.resolve("src", "middleware", "auth.js"),
  "utf8"
);
const retirementScript = fs.readFileSync(
  path.resolve("scripts", "retireTestAccounts.js"),
  "utf8"
);
const migration = fs.readFileSync(
  path.resolve(
    "prisma",
    "migrations",
    "20261116_run_account_cleanup_1a_retirement_foundation",
    "migration.sql"
  ),
  "utf8"
);

test("User has additive active-by-default account lifecycle status", () => {
  assert.match(
    schema,
    /accountStatus\s+String\s+@default\("active"\)/
  );
  assert.match(
    migration,
    /ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'active'/
  );
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM "User"/i);
});

test("retired accounts cannot create new authenticated sessions", () => {
  assert.match(
    authRoute,
    /user\.accountStatus !== "active"/
  );
});

test("retired accounts cannot use an old JWT session", () => {
  assert.match(
    authMiddleware,
    /accountStatus:\s*true/
  );
  assert.match(
    authMiddleware,
    /user\.accountStatus !== "active"/
  );
});

test("forgot-password lookup is limited to active accounts", () => {
  assert.match(
    authRoute,
    /accountStatus:\s*"active"/
  );
});

test("retirement utility is dry-run by default and requires explicit authorization to apply", () => {
  assert.match(retirementScript, /process\.argv\.includes\("--apply"\)/);
  assert.match(
    retirementScript,
    /RUNFORME_ACCOUNT_RETIREMENT_AUTHORIZED/
  );
  assert.match(
    retirementScript,
    /ACCOUNT_RETIREMENT_APPLIED=NO/
  );
});

test("retirement utility targets only reserved .test accounts and fails closed on financial linkage", () => {
  assert.match(retirementScript, /endsWith:\s*"\.test"/);
  assert.match(retirementScript, /stripeConnectedAccountId/);
  assert.match(retirementScript, /runnerPayouts/);
  assert.match(retirementScript, /runnerBankPayouts/);
  assert.match(
    retirementScript,
    /Refusing account retirement/
  );
});

test("retirement preserves history while invalidating sessions and reset tokens", () => {
  assert.match(
    retirementScript,
    /accountStatus:\s*"retired"/
  );
  assert.match(
    retirementScript,
    /sessionVersion:\s*\{ increment: 1 \}/
  );
  assert.match(
    retirementScript,
    /passwordResetToken\.updateMany/
  );
  assert.doesNotMatch(
    retirementScript,
    /user\.delete|deleteMany/
  );
});
