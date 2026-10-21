const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const authPath = path.join(__dirname, "auth.js");
const diagnosticContractPath = path.join(
  __dirname,
  "auth-recovery-runtime-diagnostic-contract.test.js"
);

test("temporary recovery-runtime diagnostic route is removed", () => {
  const source = fs.readFileSync(authPath, "utf8");

  const forbidden = [
    'router.get("/recovery-runtime-diagnostic"',
    "recoveryEnabledFlagTrue",
    "resendApiKeyPresentNonblank",
    "recoveryFromEmailPresentNonblank",
    "frontendUrlPresentNonblank",
    "globalFetchPresent",
    "recoveryDeliveryEnabled",
  ];

  for (const marker of forbidden) {
    assert.equal(
      source.includes(marker),
      false,
      `temporary recovery-runtime marker still present: ${marker}`
    );
  }
});

test("temporary recovery-runtime diagnostic contract file is removed", () => {
  assert.equal(
    fs.existsSync(diagnosticContractPath),
    false,
    "temporary recovery-runtime diagnostic contract must be removed"
  );
});