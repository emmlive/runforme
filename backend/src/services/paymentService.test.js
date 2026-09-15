const assert = require("node:assert/strict");
const test = require("node:test");

function loadPaymentService() {
  try {
    return require("./paymentService");
  } catch (error) {
    assert.fail(
      `paymentService implementation is required for this contract: ${error.code || error.message}`
    );
  }
}

function createFakeStripe() {
  const calls = {
    create: [],
    retrieve: [],
    capture: [],
    cancel: [],
  };

  const stripe = {
    paymentIntents: {
      async create(...args) {
        calls.create.push(args);
        return {
          id: "pi_test_authorize",
          client_secret: "client_secret_test_value",
          status: "requires_payment_method",
        };
      },

      async retrieve(...args) {
        calls.retrieve.push(args);
        return {
          id: args[0],
          status: "requires_capture",
        };
      },

      async capture(...args) {
        calls.capture.push(args);
        return {
          id: args[0],
          status: "succeeded",
        };
      },

      async cancel(...args) {
        calls.cancel.push(args);
        return {
          id: args[0],
          status: "canceled",
        };
      },
    },
  };

  return { stripe, calls };
}

test("creates a manual-capture authorization in minor currency units", async () => {
  const { createPaymentService } = loadPaymentService();
  const { stripe, calls } = createFakeStripe();

  const service = createPaymentService({
    stripe,
    currency: "usd",
  });

  const result = await service.createAuthorization({
    runId: "run-123",
    requesterId: "requester-456",
    holdAmount: 25,
  });

  assert.equal(calls.create.length, 1);

  const [params] = calls.create[0];

  assert.equal(params.amount, 2500);
  assert.equal(params.currency, "usd");
  assert.equal(params.capture_method, "manual");
  assert.deepEqual(params.metadata, {
    runId: "run-123",
    requesterId: "requester-456",
  });

  assert.equal(result.id, "pi_test_authorize");
});

test("authorization creation uses a deterministic provider idempotency key", async () => {
  const { createPaymentService } = loadPaymentService();
  const { stripe, calls } = createFakeStripe();

  const service = createPaymentService({
    stripe,
    currency: "usd",
  });

  await service.createAuthorization({
    runId: "run-123",
    requesterId: "requester-456",
    holdAmount: 25,
  });

  await service.createAuthorization({
    runId: "run-123",
    requesterId: "requester-456",
    holdAmount: 25,
  });

  const firstOptions = calls.create[0][1];
  const secondOptions = calls.create[1][1];

  assert.equal(
    firstOptions.idempotencyKey,
    secondOptions.idempotencyKey
  );

  assert.match(firstOptions.idempotencyKey, /run-123/);
  assert.match(firstOptions.idempotencyKey, /authorize/);
});

test("rejects a non-positive authorization amount", async () => {
  const { createPaymentService } = loadPaymentService();
  const { stripe, calls } = createFakeStripe();

  const service = createPaymentService({
    stripe,
    currency: "usd",
  });

  await assert.rejects(
    () =>
      service.createAuthorization({
        runId: "run-123",
        requesterId: "requester-456",
        holdAmount: 0,
      }),
    /positive|amount/i
  );

  assert.equal(calls.create.length, 0);
});

test("rejects a fractional whole-dollar authorization amount", async () => {
  const { createPaymentService } = loadPaymentService();
  const { stripe, calls } = createFakeStripe();

  const service = createPaymentService({
    stripe,
    currency: "usd",
  });

  await assert.rejects(
    () =>
      service.createAuthorization({
        runId: "run-123",
        requesterId: "requester-456",
        holdAmount: 25.5,
      }),
    /integer|whole|amount/i
  );

  assert.equal(calls.create.length, 0);
});

test("retrieves an existing authorization without creating another one", async () => {
  const { createPaymentService } = loadPaymentService();
  const { stripe, calls } = createFakeStripe();

  const service = createPaymentService({
    stripe,
    currency: "usd",
  });

  const result = await service.retrieveAuthorization(
    "pi_existing_test"
  );

  assert.equal(calls.retrieve.length, 1);
  assert.deepEqual(calls.retrieve[0], ["pi_existing_test"]);
  assert.equal(calls.create.length, 0);
  assert.equal(result.status, "requires_capture");
});

test("captures the exact server-supplied amount in minor currency units", async () => {
  const { createPaymentService } = loadPaymentService();
  const { stripe, calls } = createFakeStripe();

  const service = createPaymentService({
    stripe,
    currency: "usd",
  });

  await service.captureAuthorization({
    paymentIntentId: "pi_capture_test",
    runId: "run-123",
    amount: 18,
  });

  assert.equal(calls.capture.length, 1);

  const [paymentIntentId, params, options] = calls.capture[0];

  assert.equal(paymentIntentId, "pi_capture_test");
  assert.deepEqual(params, {
    amount_to_capture: 1800,
  });

  assert.match(options.idempotencyKey, /run-123/);
  assert.match(options.idempotencyKey, /capture/);
});

test("capture rejects invalid amounts before calling the provider", async () => {
  const { createPaymentService } = loadPaymentService();
  const { stripe, calls } = createFakeStripe();

  const service = createPaymentService({
    stripe,
    currency: "usd",
  });

  await assert.rejects(
    () =>
      service.captureAuthorization({
        paymentIntentId: "pi_capture_test",
        runId: "run-123",
        amount: -1,
      }),
    /positive|amount/i
  );

  assert.equal(calls.capture.length, 0);
});

test("cancels an authorization with a deterministic provider idempotency key", async () => {
  const { createPaymentService } = loadPaymentService();
  const { stripe, calls } = createFakeStripe();

  const service = createPaymentService({
    stripe,
    currency: "usd",
  });

  const result = await service.cancelAuthorization({
    paymentIntentId: "pi_cancel_test",
    runId: "run-123",
  });

  assert.equal(calls.cancel.length, 1);

  const [paymentIntentId, params, options] = calls.cancel[0];

  assert.equal(paymentIntentId, "pi_cancel_test");
  assert.deepEqual(params, {});
  assert.match(options.idempotencyKey, /run-123/);
  assert.match(options.idempotencyKey, /cancel/);

  assert.equal(result.status, "canceled");
});

test("service construction requires an injected Stripe-compatible client", () => {
  const { createPaymentService } = loadPaymentService();

  assert.throws(
    () =>
      createPaymentService({
        stripe: null,
        currency: "usd",
      }),
    /stripe|provider/i
  );
});
