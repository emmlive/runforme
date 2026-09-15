const test = require("node:test");
const assert = require("node:assert/strict");

function loadGuard() {
  try {
    return require("./paymentRuntimeGuard");
  } catch (error) {
    assert.fail(
      `paymentRuntimeGuard implementation is required: ${error.code || error.message}`
    );
  }
}

test("development permits Stripe test mode", () => {
  const { assertPaymentRuntimeAuthorized } = loadGuard();

  assert.doesNotThrow(() =>
    assertPaymentRuntimeAuthorized({
      nodeEnv: "development",
      stripeSecretKey: "sk_test_synthetic",
      livePaymentsAuthorized: undefined,
    })
  );
});

test("live Stripe key is blocked without explicit authorization", () => {
  const { assertPaymentRuntimeAuthorized } = loadGuard();

  assert.throws(
    () =>
      assertPaymentRuntimeAuthorized({
        nodeEnv: "production",
        stripeSecretKey: "sk_live_synthetic",
        livePaymentsAuthorized: undefined,
      }),
    /live payments.*not authorized/i
  );
});

test("live Stripe key is blocked outside production even when authorized", () => {
  const { assertPaymentRuntimeAuthorized } = loadGuard();

  assert.throws(
    () =>
      assertPaymentRuntimeAuthorized({
        nodeEnv: "development",
        stripeSecretKey: "sk_live_synthetic",
        livePaymentsAuthorized: "true",
      }),
    /production/i
  );
});

test("production rejects Stripe test mode", () => {
  const { assertPaymentRuntimeAuthorized } = loadGuard();

  assert.throws(
    () =>
      assertPaymentRuntimeAuthorized({
        nodeEnv: "production",
        stripeSecretKey: "sk_test_synthetic",
        livePaymentsAuthorized: "true",
      }),
    /production.*live/i
  );
});

test("production permits live Stripe only with explicit authorization", () => {
  const { assertPaymentRuntimeAuthorized } = loadGuard();

  assert.doesNotThrow(() =>
    assertPaymentRuntimeAuthorized({
      nodeEnv: "production",
      stripeSecretKey: "sk_live_synthetic",
      livePaymentsAuthorized: "true",
    })
  );
});

test("production rejects unknown Stripe credential class", () => {
  const { assertPaymentRuntimeAuthorized } = loadGuard();

  assert.throws(
    () =>
      assertPaymentRuntimeAuthorized({
        nodeEnv: "production",
        stripeSecretKey: "unknown_synthetic_key",
        livePaymentsAuthorized: "true",
      }),
    /stripe.*credential|stripe.*key/i
  );
});

test("guard errors never expose the Stripe credential value", () => {
  const { assertPaymentRuntimeAuthorized } = loadGuard();

  const syntheticSecret = "sk_live_sensitive_synthetic_value";

  let observedError;

  try {
    assertPaymentRuntimeAuthorized({
      nodeEnv: "production",
      stripeSecretKey: syntheticSecret,
      livePaymentsAuthorized: undefined,
    });
  } catch (error) {
    observedError = error;
  }

  assert.ok(observedError);
  assert.equal(
    String(observedError.message).includes(syntheticSecret),
    false
  );
});
