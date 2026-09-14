const assert = require("node:assert/strict");
const test = require("node:test");

function loadPolicy() {
  try {
    return require("./runPaymentPolicy");
  } catch (error) {
    assert.fail(
      `runPaymentPolicy implementation is required for this contract: ${error.code || error.message}`
    );
  }
}

test("capture amount is receiptAmount + runnerPayout + platformFee", () => {
  const { computeCaptureAmount } = loadPolicy();

  assert.equal(
    computeCaptureAmount({
      receiptAmount: 10,
      runnerPayout: 5,
      platformFee: 3,
    }),
    18
  );
});

test("capture amount rejects a missing receipt amount", () => {
  const { computeCaptureAmount } = loadPolicy();

  assert.throws(
    () =>
      computeCaptureAmount({
        runnerPayout: 5,
        platformFee: 3,
      }),
    /receipt/i
  );
});

test("capture amount rejects negative monetary values", () => {
  const { computeCaptureAmount } = loadPolicy();

  assert.throws(
    () =>
      computeCaptureAmount({
        receiptAmount: -1,
        runnerPayout: 5,
        platformFee: 3,
      }),
    /amount|receipt|negative/i
  );
});

test("capture amount rejects non-integer monetary values", () => {
  const { computeCaptureAmount } = loadPolicy();

  assert.throws(
    () =>
      computeCaptureAmount({
        receiptAmount: 10.5,
        runnerPayout: 5,
        platformFee: 3,
      }),
    /integer|amount/i
  );
});

test("capture is blocked until provider authorization is verified", () => {
  const { evaluateCaptureEligibility } = loadPolicy();

  const result = evaluateCaptureEligibility({
    authorizationStatus: "not_authorized",
    receiptAmount: 10,
    runnerPayout: 5,
    platformFee: 3,
    holdAmount: 25,
    receiptStatus: "uploaded",
    deliveryConfirmedAt: "2026-09-14T19:00:00.000Z",
    requiresManualReview: false,
  });

  assert.equal(result.eligible, false);
  assert.match(result.reason, /authorization/i);
  assert.equal(result.captureAmount, null);
});

test("capture is blocked before delivery confirmation", () => {
  const { evaluateCaptureEligibility } = loadPolicy();

  const result = evaluateCaptureEligibility({
    authorizationStatus: "authorized",
    receiptAmount: 10,
    runnerPayout: 5,
    platformFee: 3,
    holdAmount: 25,
    receiptStatus: "uploaded",
    deliveryConfirmedAt: null,
    requiresManualReview: false,
  });

  assert.equal(result.eligible, false);
  assert.match(result.reason, /delivery/i);
  assert.equal(result.captureAmount, null);
});

test("capture is blocked while manual review is required", () => {
  const { evaluateCaptureEligibility } = loadPolicy();

  const result = evaluateCaptureEligibility({
    authorizationStatus: "authorized",
    receiptAmount: 10,
    runnerPayout: 5,
    platformFee: 3,
    holdAmount: 25,
    receiptStatus: "uploaded",
    deliveryConfirmedAt: "2026-09-14T19:00:00.000Z",
    requiresManualReview: true,
  });

  assert.equal(result.eligible, false);
  assert.match(result.reason, /manual/i);
  assert.equal(result.captureAmount, null);
});

test("capture above the authorized hold fails closed", () => {
  const { evaluateCaptureEligibility } = loadPolicy();

  const result = evaluateCaptureEligibility({
    authorizationStatus: "authorized",
    receiptAmount: 20,
    runnerPayout: 5,
    platformFee: 3,
    holdAmount: 25,
    receiptStatus: "uploaded",
    deliveryConfirmedAt: "2026-09-14T19:00:00.000Z",
    requiresManualReview: false,
  });

  assert.equal(result.eligible, false);
  assert.match(result.reason, /hold|manual/i);
  assert.equal(result.captureAmount, 28);
});

test("capture exactly equal to the authorized hold is eligible", () => {
  const { evaluateCaptureEligibility } = loadPolicy();

  const result = evaluateCaptureEligibility({
    authorizationStatus: "authorized",
    receiptAmount: 17,
    runnerPayout: 5,
    platformFee: 3,
    holdAmount: 25,
    receiptStatus: "uploaded",
    deliveryConfirmedAt: "2026-09-14T19:00:00.000Z",
    requiresManualReview: false,
  });

  assert.deepEqual(result, {
    eligible: true,
    reason: "eligible",
    captureAmount: 25,
  });
});

test("captured payment is the only state that becomes ready for payout", () => {
  const { payoutStatusAfterCapture } = loadPolicy();

  assert.equal(payoutStatusAfterCapture("captured"), "ready_for_payout");

  for (const paymentStatus of [
    "pending_payment_method",
    "authorized",
    "capture_pending",
    "capture_failed",
    "canceled",
    "refunded",
    "manual_review_required",
  ]) {
    assert.notEqual(
      payoutStatusAfterCapture(paymentStatus),
      "ready_for_payout",
      `${paymentStatus} must not become payout-ready`
    );
  }
});

test("provider authorization helper recognizes only canonical authorized state", () => {
  const {
    isProviderAuthorized,
    requiresProviderAuthorization,
  } = loadPolicy();

  assert.equal(
    isProviderAuthorized({ authorizationStatus: "authorized" }),
    true
  );

  assert.equal(
    isProviderAuthorized({ authorizationStatus: "placeholder_authorized" }),
    false
  );

  assert.equal(
    requiresProviderAuthorization({
      holdAmount: 25,
      authorizationStatus: "not_authorized",
    }),
    true
  );

  assert.equal(
    requiresProviderAuthorization({
      holdAmount: 25,
      authorizationStatus: "authorized",
    }),
    false
  );
});
test("receipt-required run remains blocked without uploaded receipt", () => {
  const { evaluateCaptureEligibility } = loadPolicy();

  const result = evaluateCaptureEligibility({
    authorizationStatus: "authorized",
    receiptAmount: undefined,
    runnerPayout: 5,
    platformFee: 3,
    holdAmount: 18,
    maxRunnerSpend: 10,
    receiptStatus: "not_uploaded",
    deliveryConfirmedAt: "2026-09-14T19:00:00.000Z",
    requiresManualReview: false,
  });

  assert.equal(result.eligible, false);
  assert.match(result.reason, /receipt/i);
  assert.equal(result.captureAmount, null);
});

test("no-receipt run captures runner payout and platform fee without receipt proof", () => {
  const { evaluateCaptureEligibility } = loadPolicy();

  const result = evaluateCaptureEligibility({
    authorizationStatus: "authorized",
    receiptAmount: undefined,
    runnerPayout: 5,
    platformFee: 3,
    holdAmount: 8,
    maxRunnerSpend: 0,
    receiptStatus: "not_uploaded",
    deliveryConfirmedAt: "2026-09-14T19:00:00.000Z",
    requiresManualReview: false,
  });

  assert.deepEqual(result, {
    eligible: true,
    reason: "eligible",
    captureAmount: 8,
  });
});
