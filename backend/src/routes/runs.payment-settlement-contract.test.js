const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const runsPath = path.join(__dirname, "runs.js");
const source = fs.readFileSync(runsPath, "utf8");

function sliceBetween(startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);

  assert.notEqual(
    start,
    -1,
    `missing source boundary: ${startNeedle}`
  );

  const end = source.indexOf(endNeedle, start);

  assert.notEqual(
    end,
    -1,
    `missing source boundary: ${endNeedle}`
  );

  assert.ok(
    end > start,
    `invalid source boundary order: ${startNeedle}`
  );

  return source.slice(start, end);
}

const receiptRoute = sliceBetween(
  'router.post("/:runId/receipt-proof"',
  'router.post("/:runId/confirm-delivery"'
);

const deliveryRoute = sliceBetween(
  'router.post("/:runId/confirm-delivery"',
  'router.post("/:runId/manual-review/approve"'
);

const manualReviewRoute = sliceBetween(
  'router.post("/:runId/manual-review/approve"',
  "async function completeRun"
);

const completeRun = sliceBetween(
  "async function completeRun",
  'router.post("/:runId/complete"'
);

test("runs route imports canonical payment settlement service", () => {
  assert.match(
    source,
    /require\(["']\.\.\/services\/runPaymentSettlement["']\)/
  );

  assert.match(
    source,
    /\bcaptureRunPayment\b/
  );
});

test("receipt proof cannot mark payout ready before capture", () => {
  assert.doesNotMatch(
    receiptRoute,
    /ready_for_payout/
  );

  assert.match(
    receiptRoute,
    /proof_uploaded|manual_review_required/
  );
});

test("delivery confirmation cannot mark payout ready before capture", () => {
  assert.doesNotMatch(
    deliveryRoute,
    /ready_for_payout/
  );

  assert.match(
    deliveryRoute,
    /awaiting_receipt|proof_uploaded|manual_review_required|awaiting_completion/
  );
});

test("manual review approval cannot mark payout ready before capture", () => {
  assert.doesNotMatch(
    manualReviewRoute,
    /ready_for_payout/
  );

  assert.match(
    manualReviewRoute,
    /proof_uploaded|awaiting_completion/
  );
});

test("completion delegates payment capture to canonical settlement service", () => {
  assert.match(
    completeRun,
    /captureRunPayment\s*\(/
  );
});

test("completion does not assign ready_for_payout directly", () => {
  assert.doesNotMatch(
    completeRun,
    /payoutStatus\s*:\s*"ready_for_payout"/
  );

  assert.doesNotMatch(
    completeRun,
    /\?\s*"ready_for_payout"/
  );
});

test("provider capture occurs before completed status is persisted", () => {
  const captureIndex = completeRun.indexOf(
    "captureRunPayment("
  );

  const completedWriteIndex = completeRun.indexOf(
    'status: "completed"'
  );

  assert.notEqual(
    captureIndex,
    -1,
    "completion must call captureRunPayment"
  );

  assert.notEqual(
    completedWriteIndex,
    -1,
    "completion must persist completed status"
  );

  assert.ok(
    captureIndex < completedWriteIndex,
    "provider capture must succeed before completed status is written"
  );
});

test("completion uses captured settlement state rather than pre-capture run state", () => {
  assert.match(
    completeRun,
    /settlement|capturedRun|paymentResult/
  );
});

test("lifecycle routes do not call Stripe PaymentIntents directly", () => {
  assert.doesNotMatch(
    receiptRoute + deliveryRoute + manualReviewRoute + completeRun,
    /paymentIntents\./
  );
});


test("completed and captured Run retains idempotent early return", () => {
  const earlyReturnMatch = completeRun.match(
    /if\s*\(\s*existing\.status\s*===\s*"completed"([\s\S]*?)\)\s*\{([\s\S]*?)alreadyCompleted/
  );

  assert.ok(
    earlyReturnMatch,
    "completeRun must retain an idempotent completed-run early return"
  );

  const condition = earlyReturnMatch[1];

  assert.match(
    condition,
    /paymentStatus\s*===\s*"captured"/,
    "completed-run early return must require canonical captured payment state"
  );

  assert.match(
    condition,
    /payoutStatus\s*===\s*"ready_for_payout"/,
    "completed-run early return must require canonical payout-ready state"
  );
});

test("completed but uncaptured Run remains eligible to reach canonical settlement", () => {
  const statusGateMatch = completeRun.match(
    /if\s*\(\s*!\[([^\]]+)\]\.includes\(existing\.status\)\s*\)/
  );

  assert.ok(
    statusGateMatch,
    "completeRun must retain an explicit lifecycle eligibility gate"
  );

  const allowedStatuses = statusGateMatch[1];

  assert.match(
    allowedStatuses,
    /"completed"/,
    "completed-but-uncaptured recovery must be allowed to continue to settlement"
  );

  const statusGateIndex = completeRun.indexOf(statusGateMatch[0]);
  const captureIndex = completeRun.indexOf("captureRunPayment({");

  assert.ok(
    captureIndex > statusGateIndex,
    "canonical capture must remain downstream of the lifecycle gate"
  );
});
