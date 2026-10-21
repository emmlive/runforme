const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const authPath = path.join(__dirname, "auth.js");
const diagnosticContractPath = path.join(
  __dirname,
  "auth-direct-resend-diagnostic-contract.test.js"
);

test("temporary direct Resend diagnostic route is removed", () => {
  const source = fs.readFileSync(authPath, "utf8");

  assert.equal(
    source.includes('router.post("/direct-resend-outbound-test"'),
    false,
    "temporary direct Resend endpoint must be removed"
  );

  assert.equal(
    source.includes("let directResendTestUsed = false"),
    false,
    "temporary one-shot diagnostic guard must be removed"
  );

  assert.equal(
    source.includes("directResendTestUsed = true"),
    false,
    "temporary one-shot guard use must be removed"
  );

  assert.equal(
    source.includes("RUNFORME controlled outbound test"),
    false,
    "temporary diagnostic email content must be removed"
  );
});

test("temporary direct Resend diagnostic contract file is removed", () => {
  assert.equal(
    fs.existsSync(diagnosticContractPath),
    false,
    "temporary diagnostic contract test must be deleted"
  );
});