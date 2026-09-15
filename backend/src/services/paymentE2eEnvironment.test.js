const assert = require("node:assert/strict");
const test = require("node:test");

function loadEnvironmentGuard() {
  try {
    return require("./paymentE2eEnvironment");
  } catch (error) {
    assert.fail(
      "paymentE2eEnvironment implementation is required: " +
        (error.code || error.message)
    );
  }
}

test("isolated payment E2E environment accepts only non-production Stripe test mode with local PostgreSQL", () => {
  const { assertIsolatedPaymentE2eEnvironment } =
    loadEnvironmentGuard();

  const result = assertIsolatedPaymentE2eEnvironment({
    nodeEnv: "test",
    stripeSecretKey: "sk_test_synthetic_gate5",
    databaseUrl:
      "postgresql://synthetic:synthetic@127.0.0.1:65432/runforme_e2e",
  });

  assert.deepEqual(result, {
    stripeMode: "test",
    databaseScope: "local_isolated",
  });
});

test("isolated payment E2E environment rejects production runtime", () => {
  const { assertIsolatedPaymentE2eEnvironment } =
    loadEnvironmentGuard();

  assert.throws(
    () =>
      assertIsolatedPaymentE2eEnvironment({
        nodeEnv: "production",
        stripeSecretKey: "sk_test_synthetic_gate5",
        databaseUrl:
          "postgresql://synthetic:synthetic@127.0.0.1:65432/runforme_e2e",
      }),
    /production/i
  );
});

test("isolated payment E2E environment rejects live Stripe credentials", () => {
  const { assertIsolatedPaymentE2eEnvironment } =
    loadEnvironmentGuard();

  assert.throws(
    () =>
      assertIsolatedPaymentE2eEnvironment({
        nodeEnv: "test",
        stripeSecretKey: "sk_live_synthetic_gate5",
        databaseUrl:
          "postgresql://synthetic:synthetic@127.0.0.1:65432/runforme_e2e",
      }),
    /test|live|credential/i
  );
});

test("isolated payment E2E environment rejects non-local database targets", () => {
  const { assertIsolatedPaymentE2eEnvironment } =
    loadEnvironmentGuard();

  assert.throws(
    () =>
      assertIsolatedPaymentE2eEnvironment({
        nodeEnv: "test",
        stripeSecretKey: "sk_test_synthetic_gate5",
        databaseUrl:
          "postgresql://synthetic:synthetic@database.example.invalid/runforme",
      }),
    /database|local|isolated/i
  );
});