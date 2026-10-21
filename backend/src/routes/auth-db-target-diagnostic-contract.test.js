const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const authPath = path.join(__dirname, "auth.js");

function readAuthSource() {
  return fs.readFileSync(authPath, "utf8");
}

function getDiagnosticBlock(source) {
  const start = source.indexOf(
    'router.get("/database-target-diagnostic"'
  );

  assert.notEqual(
    start,
    -1,
    "temporary database-target diagnostic route must exist"
  );

  const resetStart = source.indexOf(
    'router.post("/reset-password"',
    start
  );

  assert.notEqual(
    resetStart,
    -1,
    "reset-password boundary must remain after diagnostic route"
  );

  return source.slice(start, resetStart);
}

test("temporary database-target diagnostic endpoint exists", () => {
  const source = readAuthSource();

  assert.ok(
    source.includes(
      'router.get("/database-target-diagnostic"'
    ),
    "temporary database-target diagnostic endpoint must exist"
  );
});

test("database-target diagnostic exposes only approved safe fields", () => {
  const source = readAuthSource();
  const block = getDiagnosticBlock(source);

  const required = [
    "databaseUrlPresent",
    "expectedHostMatch",
    "configuredDatabaseName",
    "currentDatabase",
  ];

  for (const marker of required) {
    assert.ok(
      block.includes(marker),
      `approved field missing: ${marker}`
    );
  }

  const forbiddenResponseFields = [
    "databaseUrl:",
    "hostname:",
    "host:",
    "username:",
    "user:",
    "password:",
    "port:",
  ];

  for (const marker of forbiddenResponseFields) {
    assert.equal(
      block.includes(marker),
      false,
      `forbidden response field detected: ${marker}`
    );
  }
});

test("database-target diagnostic may query only current_database()", () => {
  const source = readAuthSource();
  const block = getDiagnosticBlock(source);

  assert.ok(
    block.includes("current_database()"),
    "diagnostic must verify the active database name"
  );

  const forbidden = [
    '"User"',
    "user.find",
    "passwordResetToken",
    "PasswordResetToken",
    "SELECT *",
    "information_schema",
    "pg_catalog",
    "pg_stat_activity",
  ];

  for (const marker of forbidden) {
    assert.equal(
      block.includes(marker),
      false,
      `forbidden database access detected: ${marker}`
    );
  }
});

test("database-target diagnostic cannot invoke recovery, provider, or payments", () => {
  const source = readAuthSource();
  const block = getDiagnosticBlock(source);

  const forbidden = [
    "passwordRecovery",
    "issuePasswordReset",
    "recoveryDelivery.send",
    "api.resend.com",
    "stripe",
    "paymentIntent",
  ];

  for (const marker of forbidden) {
    assert.equal(
      block.includes(marker),
      false,
      `forbidden behavior detected: ${marker}`
    );
  }
});

test("database-target diagnostic never serializes DATABASE_URL or connection credentials", () => {
  const source = readAuthSource();
  const block = getDiagnosticBlock(source);

  assert.equal(
    block.includes("res.json(process.env"),
    false,
    "route must never serialize process.env"
  );

  assert.equal(
    block.includes("DATABASE_URL:"),
    false,
    "route must never return DATABASE_URL"
  );

  assert.equal(
    block.includes("parsed.hostname"),
    false,
    "route must not return parsed hostname directly"
  );

  assert.equal(
    block.includes("parsed.username"),
    false,
    "route must not return parsed username"
  );

  assert.equal(
    block.includes("parsed.password"),
    false,
    "route must not return parsed password"
  );
});