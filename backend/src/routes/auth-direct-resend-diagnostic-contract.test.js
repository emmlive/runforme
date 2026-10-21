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
    'router.post("/direct-resend-outbound-test"'
  );

  assert.notEqual(
    start,
    -1,
    "temporary direct Resend diagnostic route must exist"
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

test("temporary direct Resend outbound endpoint exists", () => {
  const source = readAuthSource();

  assert.ok(
    source.includes(
      'router.post("/direct-resend-outbound-test"'
    ),
    "temporary direct Resend test endpoint must exist"
  );
});

test("direct Resend diagnostic is bounded to one provider attempt per process", () => {
  const source = readAuthSource();
  const block = getDiagnosticBlock(source);

  assert.ok(
    source.includes("let directResendTestUsed = false"),
    "module must maintain a one-shot process guard"
  );

  assert.ok(
    block.includes("directResendTestUsed"),
    "route must enforce the one-shot guard"
  );

  assert.ok(
    block.includes("directResendTestUsed = true"),
    "route must consume the one-shot guard before provider work"
  );
});

test("direct Resend diagnostic uses only approved fixed recipient and runtime sender", () => {
  const source = readAuthSource();
  const block = getDiagnosticBlock(source);

  assert.ok(
    block.includes('"hello@runforme.co"'),
    "recipient must be fixed to hello@runforme.co"
  );

  assert.ok(
    block.includes("process.env.RESEND_API_KEY"),
    "route must use existing runtime Resend key"
  );

  assert.ok(
    block.includes("process.env.RECOVERY_FROM_EMAIL"),
    "route must use existing runtime sender"
  );

  assert.ok(
    block.includes('"https://api.resend.com/emails"'),
    "route must call the canonical Resend email endpoint"
  );

  assert.ok(
    block.includes("globalThis.fetch"),
    "route must use the runtime fetch implementation"
  );
});

test("direct Resend diagnostic cannot touch recovery tokens, database, or payments", () => {
  const source = readAuthSource();
  const block = getDiagnosticBlock(source);

  const forbidden = [
    "prisma.",
    "passwordRecovery",
    "issuePasswordReset",
    "PasswordResetToken",
    "passwordResetToken",
    "stripe",
    "paymentIntent",
  ];

  for (const marker of forbidden) {
    assert.equal(
      block.includes(marker),
      false,
      `diagnostic must not contain forbidden behavior: ${marker}`
    );
  }
});

test("direct Resend diagnostic response cannot expose secrets or provider body", () => {
  const source = readAuthSource();
  const block = getDiagnosticBlock(source);

  assert.equal(
    block.includes("res.json(process.env"),
    false,
    "route must never serialize process.env"
  );

  assert.equal(
    block.includes("apiKey:"),
    false,
    "route response must not expose API key material"
  );

  assert.equal(
    block.includes("response.text()"),
    false,
    "route must not return or inspect provider response body"
  );

  assert.equal(
    block.includes("response.json()"),
    false,
    "route must not return or inspect provider JSON body"
  );
});