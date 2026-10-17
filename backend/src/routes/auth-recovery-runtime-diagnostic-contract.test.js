const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const authPath = path.join(__dirname, "auth.js");

function readAuthSource() {
  return fs.readFileSync(authPath, "utf8");
}

test("temporary recovery runtime diagnostic endpoint exists", () => {
  const source = readAuthSource();

  assert.ok(
    source.includes(
      'router.get("/recovery-runtime-diagnostic"'
    ),
    "temporary recovery runtime diagnostic route must exist"
  );
});

test("runtime diagnostic reports only non-secret boolean recovery readiness", () => {
  const source = readAuthSource();

  const start = source.indexOf(
    'router.get("/recovery-runtime-diagnostic"'
  );

  assert.notEqual(
    start,
    -1,
    "temporary diagnostic route must exist"
  );

  const block = source.slice(start, start + 2200);

  assert.ok(
    block.includes("recoveryDelivery.isEnabled()"),
    "diagnostic must report recoveryDelivery.isEnabled()"
  );

  assert.ok(
    block.includes("RUNFORME_RECOVERY_DELIVERY_ENABLED"),
    "diagnostic must inspect recovery enabled flag"
  );

  assert.ok(
    block.includes("RESEND_API_KEY"),
    "diagnostic must inspect API key presence only"
  );

  assert.ok(
    block.includes("RECOVERY_FROM_EMAIL"),
    "diagnostic must inspect sender presence only"
  );

  assert.ok(
    block.includes("FRONTEND_URL"),
    "diagnostic must inspect frontend URL presence only"
  );

  assert.ok(
    block.includes("globalThis.fetch"),
    "diagnostic must report fetch availability"
  );
});

test("runtime diagnostic does not return recovery secret values", () => {
  const source = readAuthSource();

  const start = source.indexOf(
    'router.get("/recovery-runtime-diagnostic"'
  );

  assert.notEqual(start, -1);

  const block = source.slice(start, start + 2200);

  assert.equal(
    block.includes("res.json(process.env"),
    false,
    "diagnostic must never serialize process.env"
  );

  assert.equal(
    block.includes("apiKey: process.env.RESEND_API_KEY"),
    false,
    "diagnostic response must not expose the Resend API key"
  );

  assert.equal(
    block.includes("fromEmail: process.env.RECOVERY_FROM_EMAIL"),
    false,
    "diagnostic response must not expose sender value"
  );

  assert.equal(
    block.includes("frontendUrl: process.env.FRONTEND_URL"),
    false,
    "diagnostic response must not expose frontend URL value"
  );
});