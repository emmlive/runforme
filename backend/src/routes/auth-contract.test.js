const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const routePath = path.join(__dirname, "auth.js");
const appPath = path.join(__dirname, "..", "app.js");

const FORGOT_RESPONSE =
  "If an account exists for that email and recovery is available, instructions will be sent.";
const INVALID_RESET_RESPONSE = "Invalid or expired reset link";

function readAuthRoute() {
  assert.ok(fs.existsSync(routePath), "dedicated auth router must exist");
  return fs.readFileSync(routePath, "utf8");
}

test("dedicated auth router exists", () => {
  assert.ok(fs.existsSync(routePath), "dedicated auth router must exist");
});

test("auth router imports the canonical password validator", () => {
  const source = readAuthRoute();

  assert.ok(
    source.includes(
      'require("../services/passwordPolicy")'
    ) || source.includes(
      "require('../services/passwordPolicy')"
    ),
    "auth router must import passwordPolicy"
  );
  assert.ok(source.includes("validatePassword"));
});

test("register and reset both reuse the canonical password validator", () => {
  const source = readAuthRoute();

  const registerStart = source.indexOf(
    'router.post("/register"'
  );
  const loginStart = source.indexOf(
    'router.post("/login"'
  );
  const resetStart = source.indexOf(
    'router.post("/reset-password"'
  );

  assert.notEqual(registerStart, -1, "register route must exist");
  assert.notEqual(loginStart, -1, "login route must exist");
  assert.notEqual(resetStart, -1, "reset-password route must exist");

  const registerBlock = source.slice(registerStart, loginStart);
  const resetBlock = source.slice(resetStart);

  assert.ok(registerBlock.includes("validatePassword(password)"));
  assert.ok(resetBlock.includes("validatePassword(newPassword)"));
});

test("forgot-password uses the exact neutral enumeration-safe response", () => {
  const source = readAuthRoute();

  assert.ok(source.includes('router.post("/forgot-password"'));
  assert.ok(
    source.includes(FORGOT_RESPONSE),
    "forgot-password must use approved neutral response copy"
  );
});

test("forgot-password public response does not expose account existence or raw token material", () => {
  const source = readAuthRoute();
  const forgotStart = source.indexOf(
    'router.post("/forgot-password"'
  );
  const resetStart = source.indexOf(
    'router.post("/reset-password"'
  );

  assert.notEqual(forgotStart, -1, "forgot-password route must exist");
  assert.notEqual(resetStart, -1, "reset-password route must exist");

  const forgotBlock = source.slice(forgotStart, resetStart);

  assert.equal(forgotBlock.includes("accountExists:"), false);
  assert.equal(forgotBlock.includes("userExists:"), false);
  assert.equal(forgotBlock.includes("rawToken:"), false);
  assert.equal(forgotBlock.includes("token:"), false);
  assert.equal(forgotBlock.includes("resetUrl:"), false);
});

test("reset-password uses the exact generic invalid-or-expired response", () => {
  const source = readAuthRoute();

  assert.ok(source.includes('router.post("/reset-password"'));
  assert.ok(
    source.includes(INVALID_RESET_RESPONSE),
    "reset-password must use approved generic invalid-link response"
  );
});

test("forgot and reset delegate token lifecycle work to passwordRecovery service", () => {
  const source = readAuthRoute();

  assert.ok(
    source.includes(
      'require("../services/passwordRecovery")'
    ) || source.includes(
      "require('../services/passwordRecovery')"
    ),
    "auth router must import passwordRecovery"
  );

  assert.ok(source.includes("createPasswordRecoveryService"));
  assert.ok(source.includes("issuePasswordReset"));
  assert.ok(source.includes("resetPassword"));
});

test("app mounts dedicated auth router at /api/auth", () => {
  const source = fs.readFileSync(appPath, "utf8");

  assert.ok(
    source.includes(
      'require("./routes/auth")'
    ) || source.includes(
      "require('./routes/auth')"
    ),
    "app must import dedicated auth router"
  );

  assert.ok(
    source.includes('app.use("/api/auth"') ||
      source.includes("app.use('/api/auth'"),
    "app must mount auth router at /api/auth"
  );
});
