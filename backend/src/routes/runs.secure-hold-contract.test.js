const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const runsPath = path.join(__dirname, "runs.js");
const source = fs.readFileSync(runsPath, "utf8");

const routeStart = source.indexOf(
  'router.post("/:runId/authorize-hold"'
);

const nextRoute = source.indexOf(
  'router.post("/:runId/receipt-proof"',
  routeStart
);

assert.notEqual(
  routeStart,
  -1,
  "authorize-hold route must remain present"
);

assert.notEqual(
  nextRoute,
  -1,
  "receipt-proof route boundary must remain present"
);

const authorizeHoldRoute = source.slice(
  routeStart,
  nextRoute
);

test("Secure Hold route delegates to canonical authorizeSecureHold service", () => {
  assert.match(
    authorizeHoldRoute,
    /authorizeSecureHold\s*\(/
  );
});

test("Secure Hold route no longer writes placeholder payment states", () => {
  assert.doesNotMatch(
    authorizeHoldRoute,
    /placeholder_authorized/
  );

  assert.doesNotMatch(
    authorizeHoldRoute,
    /hold_placeholder/
  );
});

test("Secure Hold route no longer returns placeholder response semantics", () => {
  assert.doesNotMatch(
    authorizeHoldRoute,
    /placeholder\s*:\s*true/
  );

  assert.doesNotMatch(
    authorizeHoldRoute,
    /charged\s*:\s*false/
  );

  assert.doesNotMatch(
    authorizeHoldRoute,
    /Secure hold placeholder/i
  );
});

test("Secure Hold route supports client confirmation response", () => {
  assert.match(
    authorizeHoldRoute,
    /clientSecret/
  );
});

test("Secure Hold route does not call Stripe PaymentIntents directly", () => {
  assert.doesNotMatch(
    authorizeHoldRoute,
    /paymentIntents\./
  );
});
test("runs route imports canonical Secure Hold orchestration", () => {
  assert.match(
    source,
    /require\(["']\.\.\/services\/secureHoldService["']\)/
  );
});

test("runner accept gate recognizes canonical authorization rather than placeholder state", () => {
  assert.doesNotMatch(
    source,
    /placeholder_authorized/
  );

  assert.match(
    source,
    /authorizationStatus\s*!==\s*"authorized"/
  );
});
test("positive hold requires canonical provider authorization even when purchase budget is zero", () => {
  const helperStart = source.indexOf(
    "function requiresHoldAuthorization(run)"
  );

  assert.notEqual(
    helperStart,
    -1,
    "requiresHoldAuthorization helper must remain present"
  );

  const helperEnd = source.indexOf(
    "const HANDOFF_REQUIREMENTS",
    helperStart
  );

  assert.notEqual(
    helperEnd,
    -1,
    "requiresHoldAuthorization helper boundary must remain present"
  );

  const helper = source.slice(
    helperStart,
    helperEnd
  );

  assert.match(
    helper,
    /holdAmount/
  );

  assert.doesNotMatch(
    helper,
    /itemBudgetEstimate/
  );

  assert.match(
    helper,
    /authorizationStatus\s*!==\s*"authorized"/
  );
});
test("payment service factory requires configured runtime currency", () => {
  const factoryStart = source.indexOf(
    "function getSecureHoldPaymentService()"
  );

  assert.notEqual(
    factoryStart,
    -1,
    "payment service factory must remain present"
  );

  const factoryEnd = source.indexOf(
    "const router = express.Router()",
    factoryStart
  );

  assert.notEqual(
    factoryEnd,
    -1,
    "payment service factory boundary must remain present"
  );

  const factory = source.slice(
    factoryStart,
    factoryEnd
  );

  assert.match(
    factory,
    /process\.env\.STRIPE_CURRENCY/
  );

  assert.match(
    factory,
    /if\s*\(\s*!currency\s*\)/
  );

  assert.doesNotMatch(
    factory,
    /currency\s*:\s*["']usd["']/
  );

  assert.match(
    factory,
    /currency\s*:\s*currency/
  );
});

test("runs route contains no hard-coded provider currency literal", () => {
  assert.doesNotMatch(
    source,
    /currency\s*:\s*["']usd["']/
  );
});
