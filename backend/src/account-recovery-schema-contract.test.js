const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");

test("User declares sessionVersion with a zero default", () => {
  assert.match(
    schema,
    /^\s*sessionVersion\s+Int\s+@default\(0\)\s*$/m,
    "User.sessionVersion Int @default(0) is required"
  );
});

test("User declares the password-reset token relation", () => {
  assert.match(
    schema,
    /^\s*passwordResetTokens\s+PasswordResetToken\[\]\s*$/m,
    "User.passwordResetTokens relation is required"
  );
});

test("PasswordResetToken declares the approved security fields", () => {
  assert.match(schema, /^\s*model\s+PasswordResetToken\s*\{/m);
  assert.match(schema, /^\s*tokenHash\s+String\s+@unique\s*$/m);
  assert.match(schema, /^\s*expiresAt\s+DateTime\s*$/m);
  assert.match(schema, /^\s*consumedAt\s+DateTime\?\s*$/m);
  assert.match(schema, /^\s*revokedAt\s+DateTime\?\s*$/m);
  assert.match(schema, /^\s*createdAt\s+DateTime\s+@default\(now\(\)\)\s*$/m);
});

test("PasswordResetToken belongs to User with cascade delete", () => {
  assert.match(schema, /^\s*userId\s+Int\s*$/m);
  assert.match(
    schema,
    /^\s*user\s+User\s+@relation\(fields:\s*\[userId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)\s*$/m
  );
});

test("PasswordResetToken indexes user and expiration lookup fields", () => {
  assert.match(schema, /^\s*@@index\(\[userId\]\)\s*$/m);
  assert.match(schema, /^\s*@@index\(\[expiresAt\]\)\s*$/m);
});

const migrationPath = path.join(
  __dirname,
  "..",
  "prisma",
  "migrations",
  "20260916_account_recovery_session_version",
  "migration.sql"
);

function readMigration() {
  assert.ok(
    fs.existsSync(migrationPath),
    "account recovery migration file must exist"
  );
  return fs.readFileSync(migrationPath, "utf8");
}

test("account recovery migration file exists", () => {
  assert.ok(
    fs.existsSync(migrationPath),
    "account recovery migration file must exist"
  );
});

test("account recovery migration is additive and creates approved fields", () => {
  const migration = readMigration();

  assert.match(
    migration,
    /ALTER TABLE\s+"User"\s+ADD COLUMN\s+"sessionVersion"\s+INTEGER\s+NOT NULL\s+DEFAULT\s+0/i
  );
  assert.match(migration, /CREATE TABLE\s+"PasswordResetToken"/i);
  assert.match(migration, /"tokenHash"\s+TEXT\s+NOT NULL/i);
  assert.match(migration, /"expiresAt"\s+TIMESTAMP\(3\)\s+NOT NULL/i);
  assert.match(migration, /"consumedAt"\s+TIMESTAMP\(3\)/i);
  assert.match(migration, /"revokedAt"\s+TIMESTAMP\(3\)/i);
  assert.match(migration, /ON DELETE CASCADE/i);
});

test("account recovery migration includes required uniqueness and indexes", () => {
  const migration = readMigration();

  assert.match(migration, /tokenHash.*UNIQUE|UNIQUE.*tokenHash/is);
  assert.match(migration, /PasswordResetToken_userId_idx/i);
  assert.match(migration, /PasswordResetToken_expiresAt_idx/i);
});

test("account recovery migration contains no destructive password or user rewrite", () => {
  const migration = readMigration();

  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(migration, /\bDROP\s+COLUMN\b/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\b/i);
  assert.doesNotMatch(migration, /\bUPDATE\s+"?User"?\b/i);
});
