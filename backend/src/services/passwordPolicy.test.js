const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const policyPath = path.join(__dirname, "passwordPolicy.js");

function loadPolicy() {
  assert.ok(
    fs.existsSync(policyPath),
    "canonical passwordPolicy service must exist"
  );

  delete require.cache[require.resolve(policyPath)];
  return require(policyPath);
}

test("canonical password policy service exists", () => {
  assert.ok(
    fs.existsSync(policyPath),
    "canonical passwordPolicy service must exist"
  );
});

test("rejects passwords shorter than 12 characters", () => {
  const { validatePassword } = loadPolicy();
  const result = validatePassword("12345678901");

  assert.deepEqual(result, {
    valid: false,
    error: "Password must be between 12 and 128 characters.",
  });
});

test("accepts a password exactly 12 characters long", () => {
  const { validatePassword } = loadPolicy();
  const result = validatePassword("aaaaaaaaaaaa");

  assert.deepEqual(result, { valid: true, error: null });
});

test("accepts a password exactly 128 characters long", () => {
  const { validatePassword } = loadPolicy();
  const result = validatePassword("a".repeat(128));

  assert.deepEqual(result, { valid: true, error: null });
});

test("rejects passwords longer than 128 characters", () => {
  const { validatePassword } = loadPolicy();
  const result = validatePassword("a".repeat(129));

  assert.deepEqual(result, {
    valid: false,
    error: "Password must be between 12 and 128 characters.",
  });
});

test("does not impose composition requirements", () => {
  const { validatePassword } = loadPolicy();
  const result = validatePassword("abcdefghijkl");

  assert.deepEqual(result, { valid: true, error: null });
});

test("rejects non-string password values", () => {
  const { validatePassword } = loadPolicy();

  assert.deepEqual(validatePassword(null), {
    valid: false,
    error: "Password must be between 12 and 128 characters.",
  });

  assert.deepEqual(validatePassword(undefined), {
    valid: false,
    error: "Password must be between 12 and 128 characters.",
  });
});
