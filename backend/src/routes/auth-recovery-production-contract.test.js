const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const authPath = path.join(__dirname, "auth.js");
const limiterPath = path.join(
  __dirname,
  "..",
  "services",
  "recoveryRequestLimiter.js"
);

function readAuthSource() {
  return fs.readFileSync(authPath, "utf8");
}

test("production forgot-password reset URL uses trusted FRONTEND_URL rather than request host", () => {
  const source = readAuthSource();

  const forgotStart = source.indexOf(
    'router.post("/forgot-password"'
  );

  const resetStart = source.indexOf(
    'router.post("/reset-password"'
  );

  assert.notEqual(forgotStart, -1);
  assert.notEqual(resetStart, -1);

  const forgotBlock = source.slice(forgotStart, resetStart);

  assert.ok(
    forgotBlock.includes("process.env.FRONTEND_URL"),
    "forgot-password must derive the reset URL from FRONTEND_URL"
  );

  assert.equal(
    forgotBlock.includes("req.protocol"),
    false,
    "forgot-password must not trust request protocol for reset URL origin"
  );

  assert.equal(
    forgotBlock.includes('req.get("host")'),
    false,
    "forgot-password must not trust request Host header for reset URL origin"
  );
});

test("forgot-password route has a dedicated recovery abuse-control boundary", () => {
  assert.ok(
    fs.existsSync(limiterPath),
    "recoveryRequestLimiter service must exist"
  );

  const source = readAuthSource();

  assert.ok(
    source.includes(
      'require("../services/recoveryRequestLimiter")'
    ) ||
      source.includes(
        "require('../services/recoveryRequestLimiter')"
      ),
    "auth route must import recoveryRequestLimiter"
  );

  assert.ok(
    source.includes("checkRecoveryRequest"),
    "forgot-password must enforce the recovery request limiter"
  );
});

test("forgot-password rate limits IP and normalized email independently", () => {
  const source = readAuthSource();

  const forgotStart = source.indexOf(
    'router.post("/forgot-password"'
  );

  const resetStart = source.indexOf(
    'router.post("/reset-password"'
  );

  assert.notEqual(forgotStart, -1);
  assert.notEqual(resetStart, -1);

  const forgotBlock = source.slice(forgotStart, resetStart);

  const limiterCalls =
    forgotBlock.match(/\.checkRecoveryRequest\(/g) || [];

  assert.equal(
    limiterCalls.length,
    2,
    "forgot-password must enforce separate IP and email limiter buckets"
  );

  assert.ok(
    forgotBlock.includes("`ip:"),
    "forgot-password must use an IP limiter key"
  );

  assert.ok(
    forgotBlock.includes("`email:"),
    "forgot-password must use an email limiter key"
  );
});
test("recovery abuse-control service exports a deterministic limiter contract", () => {
  assert.ok(
    fs.existsSync(limiterPath),
    "recoveryRequestLimiter service must exist"
  );

  delete require.cache[
    require.resolve(limiterPath)
  ];

  const {
    createRecoveryRequestLimiter,
  } = require(limiterPath);

  assert.equal(
    typeof createRecoveryRequestLimiter,
    "function"
  );

  const limiter = createRecoveryRequestLimiter({
    maxAttempts: 3,
    windowMs: 60_000,
    now: () => 1_000,
  });

  assert.equal(
    typeof limiter.checkRecoveryRequest,
    "function"
  );
});

test("forgot-password keeps enumeration-safe public response when provider work fails", () => {
  const source = readAuthSource();

  const forgotStart = source.indexOf(
    'router.post("/forgot-password"'
  );

  const resetStart = source.indexOf(
    'router.post("/reset-password"'
  );

  const forgotBlock = source.slice(forgotStart, resetStart);

  assert.ok(
    forgotBlock.includes(
      "FORGOT_PASSWORD_RESPONSE"
    ),
    "forgot-password must retain neutral public response"
  );

  assert.equal(
    forgotBlock.includes("err.message"),
    false,
    "provider error detail must not enter public response"
  );
});
test("recovery handlers do not log caught error objects", () => {
  const source = readAuthSource();

  const forgotStart = source.indexOf(
    'router.post("/forgot-password"'
  );

  const resetStart = source.indexOf(
    'router.post("/reset-password"'
  );

  assert.notEqual(forgotStart, -1);
  assert.notEqual(resetStart, -1);

  const forgotBlock = source.slice(
    forgotStart,
    resetStart
  );

  const resetBlock = source.slice(
    resetStart
  );

  assert.equal(
    /console\.error\s*\([^)]*,\s*err\s*\)/.test(
      forgotBlock
    ),
    false,
    "forgot-password must not log the caught error object"
  );

  assert.equal(
    /console\.error\s*\([^)]*,\s*err\s*\)/.test(
      resetBlock
    ),
    false,
    "reset-password must not log the caught error object"
  );

  assert.ok(
    forgotBlock.includes(
      'console.error("Forgot password error")'
    ),
    "forgot-password should retain a generic diagnostic marker"
  );

  assert.ok(
    resetBlock.includes(
      'console.error("Reset password error")'
    ),
    "reset-password should retain a generic diagnostic marker"
  );
});