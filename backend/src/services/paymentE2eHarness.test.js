const assert = require("node:assert/strict");
const test = require("node:test");

function loadHarness() {
  try {
    return require("./paymentE2eHarness");
  } catch (error) {
    assert.fail(
      "paymentE2eHarness implementation is required: " +
        (error.code || error.message)
    );
  }
}

test("isolated lifecycle reaches authorized, captured, and payout-ready without external dependencies", async () => {
  const { runSyntheticPaymentLifecycle } = loadHarness();

  const calls = [];

  const stripe = {
    paymentIntents: {
      async create(params, options) {
        calls.push({
          operation: "create",
          params,
          options,
        });

        return {
          id: "pi_synthetic_e2e",
          status: "requires_capture",
          client_secret: "synthetic_client_secret",
        };
      },

      async retrieve(id) {
        calls.push({
          operation: "retrieve",
          id,
        });

        return {
          id,
          status: "requires_capture",
          client_secret: null,
        };
      },

      async capture(id, params, options) {
        calls.push({
          operation: "capture",
          id,
          params,
          options,
        });

        return {
          id,
          status: "succeeded",
        };
      },

      async cancel(id, params, options) {
        calls.push({
          operation: "cancel",
          id,
          params,
          options,
        });

        return {
          id,
          status: "canceled",
        };
      },
    },
  };

  const result = await runSyntheticPaymentLifecycle({
    stripe,
    currency: "usd",
    run: {
      id: "run-synthetic-e2e",
      holdAmount: 25,
      maxRunnerSpend: 10,
      receiptAmount: 10,
      runnerPayout: 5,
      platformFee: 3,
      authorizationStatus: "not_authorized",
      paymentStatus: "pending_payment_method",
      paymentIntentId: null,
      receiptStatus: "uploaded",
      deliveryConfirmedAt: "2026-09-15T00:00:00.000Z",
      requiresManualReview: false,
      payoutStatus: "not_started",
    },
  });

  assert.equal(result.run.authorizationStatus, "authorized");
  assert.equal(result.run.paymentStatus, "captured");
  assert.equal(result.run.payoutStatus, "ready_for_payout");
  assert.equal(result.captureAmount, 18);

  assert.deepEqual(
    calls.map((entry) => entry.operation),
    ["create", "capture"]
  );
});

test("isolated lifecycle never captures when manual review is required", async () => {
  const { runSyntheticPaymentLifecycle } = loadHarness();

  const calls = [];

  const stripe = {
    paymentIntents: {
      async create() {
        calls.push("create");

        return {
          id: "pi_synthetic_review",
          status: "requires_capture",
          client_secret: null,
        };
      },

      async retrieve(id) {
        calls.push("retrieve");

        return {
          id,
          status: "requires_capture",
          client_secret: null,
        };
      },

      async capture() {
        calls.push("capture");

        return {
          id: "pi_synthetic_review",
          status: "succeeded",
        };
      },

      async cancel() {
        calls.push("cancel");

        return {
          id: "pi_synthetic_review",
          status: "canceled",
        };
      },
    },
  };

  await assert.rejects(
    () =>
      runSyntheticPaymentLifecycle({
        stripe,
        currency: "usd",
        run: {
          id: "run-synthetic-review",
          holdAmount: 25,
          maxRunnerSpend: 10,
          receiptAmount: 10,
          runnerPayout: 5,
          platformFee: 3,
          authorizationStatus: "not_authorized",
          paymentStatus: "pending_payment_method",
          paymentIntentId: null,
          receiptStatus: "uploaded",
          deliveryConfirmedAt: "2026-09-15T00:00:00.000Z",
          requiresManualReview: true,
          payoutStatus: "not_started",
        },
      }),
    /manual/i
  );

  assert.equal(calls.includes("capture"), false);
});

test("isolated lifecycle never captures above the authorized hold", async () => {
  const { runSyntheticPaymentLifecycle } = loadHarness();

  const calls = [];

  const stripe = {
    paymentIntents: {
      async create() {
        calls.push("create");

        return {
          id: "pi_synthetic_over_hold",
          status: "requires_capture",
          client_secret: null,
        };
      },

      async retrieve(id) {
        calls.push("retrieve");

        return {
          id,
          status: "requires_capture",
          client_secret: null,
        };
      },

      async capture() {
        calls.push("capture");

        return {
          id: "pi_synthetic_over_hold",
          status: "succeeded",
        };
      },

      async cancel() {
        calls.push("cancel");

        return {
          id: "pi_synthetic_over_hold",
          status: "canceled",
        };
      },
    },
  };

  await assert.rejects(
    () =>
      runSyntheticPaymentLifecycle({
        stripe,
        currency: "usd",
        run: {
          id: "run-synthetic-over-hold",
          holdAmount: 25,
          maxRunnerSpend: 20,
          receiptAmount: 20,
          runnerPayout: 5,
          platformFee: 3,
          authorizationStatus: "not_authorized",
          paymentStatus: "pending_payment_method",
          paymentIntentId: null,
          receiptStatus: "uploaded",
          deliveryConfirmedAt: "2026-09-15T00:00:00.000Z",
          requiresManualReview: false,
          payoutStatus: "not_started",
        },
      }),
    /hold|manual/i
  );

  assert.equal(calls.includes("capture"), false);
});