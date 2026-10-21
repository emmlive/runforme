const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const authPath = path.join(__dirname, "auth.js");
const diagnosticContractPath = path.join(
  __dirname,
  "auth-db-target-diagnostic-contract.test.js"
);

test("temporary database-target diagnostic route is removed", () => {
  const source = fs.readFileSync(authPath, "utf8");

  const forbidden = [
    'router.get("/database-target-diagnostic"',
    "databaseUrlPresent",
    "expectedHostMatch",
    "configuredDatabaseName",
    "current_database()",
  ];

  for (const marker of forbidden) {
    assert.equal(
      source.includes(marker),
      false,
      `temporary database-target marker still present: ${marker}`
    );
  }
});

test("temporary database-target diagnostic contract file is removed", () => {
  assert.equal(
    fs.existsSync(diagnosticContractPath),
    false,
    "temporary database-target diagnostic contract must be removed"
  );
});