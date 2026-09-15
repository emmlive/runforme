const assert = require("node:assert/strict");
const test = require("node:test");

function loadSecureHoldService() {
  try {
    return require("./secureHoldService");
  } catch (error) {
    assert.fail(
      `secureHoldService implementation is required for this contract: ${error.code || error.message}`
    );
  }
}

function createHarness({
  runOverrides = {},
  createResult = {
    id: "pi_created_test",
    client_secret: "client_secret_test_value",
    status: "requires_payment_method",
  },
  retrieveResult = {
    id: "pi_existing_test",
    status: "requires_capture",
  },
} = {}) {
  const run = {
    id: "run-123",
    requesterId: "requester-456",
    holdAmount: 25,
    paymentIntentId: null,
    authorizationStatus: "not_authorized",
    paymentStatus: "pending_payment_method",
    assignedRunnerId: null,
    status: "open",
    ...runOverrides,
  };

  const calls = {
    createAuthorization: [],
    retrieveAuthorization: [],
    update: [],
    releasePendingOffers: [],
  };

  const paymentService = {
    async createAuthorization(args) {
      calls.createAuthorization.push(args);
      return createResult;
    },

    async retrieveAuthorization(paymentIntentId) {
      calls.retrieveAuthorization.push(paymentIntentId);
      return retrieveResult;
    },
  };

  const prisma = {
    run: {
      async update(args) {
        calls.update.push(args);
        Object.assign(run, args.data);
        return { ...run };
      },
    },
  };

  async function releasePendingOffers(runId) {
    calls.releasePendingOffers.push(runId);
  }

  return {
    run,
    calls,
    paymentService,
    prisma,
    releasePendingOffers,
  };
}

test("requires a positive Secure Hold amount", async () => {
  const { authorizeSecureHold } = loadSecureHoldService();

  const harness = createHarness({
    runOverrides: { holdAmount: 0 },
  });

  await assert.rejects(
    () =>
      authorizeSecureHold({
        run: harness.run,
        prisma: harness.prisma,
        paymentService: harness.paymentService,
        releasePendingOffers: harness.releasePendingOffers,
      }),
    /hold|positive|amount/i
  );

  assert.equal(harness.calls.createAuthorization.length, 0);
  assert.equal(harness.calls.releasePendingOffers.length, 0);
});

test("first authorization creates exactly one PaymentIntent", async () => {
  const { authorizeSecureHold } = loadSecureHoldService();

  const harness = createHarness();

  const result = await authorizeSecureHold({
    run: harness.run,
    prisma: harness.prisma,
    paymentService: harness.paymentService,
    releasePendingOffers: harness.releasePendingOffers,
  });

  assert.equal(harness.calls.createAuthorization.length, 1);

  assert.deepEqual(
    harness.calls.createAuthorization[0],
    {
      runId: "run-123",
      requesterId: "requester-456",
      holdAmount: 25,
    }
  );

  assert.equal(result.state, "requires_confirmation");
  assert.equal(result.clientSecret, "client_secret_test_value");
});

test("first authorization persists provider PaymentIntent id", async () => {
  const { authorizeSecureHold } = loadSecureHoldService();

  const harness = createHarness();

  const result = await authorizeSecureHold({
    run: harness.run,
    prisma: harness.prisma,
    paymentService: harness.paymentService,
    releasePendingOffers: harness.releasePendingOffers,
  });

  assert.equal(result.run.paymentIntentId, "pi_created_test");

  assert.equal(
    harness.calls.update.some(
      (entry) =>
        entry.where?.id === "run-123" &&
        entry.data?.paymentIntentId === "pi_created_test"
    ),
    true
  );
});

test("offers remain blocked while client confirmation is still required", async () => {
  const { authorizeSecureHold } = loadSecureHoldService();

  const harness = createHarness();

  const result = await authorizeSecureHold({
    run: harness.run,
    prisma: harness.prisma,
    paymentService: harness.paymentService,
    releasePendingOffers: harness.releasePendingOffers,
  });

  assert.equal(result.state, "requires_confirmation");
  assert.equal(harness.calls.releasePendingOffers.length, 0);
  assert.notEqual(result.run.authorizationStatus, "authorized");
});

test("existing PaymentIntent is retrieved instead of recreated", async () => {
  const { authorizeSecureHold } = loadSecureHoldService();

  const harness = createHarness({
    runOverrides: {
      paymentIntentId: "pi_existing_test",
    },
  });

  await authorizeSecureHold({
    run: harness.run,
    prisma: harness.prisma,
    paymentService: harness.paymentService,
    releasePendingOffers: harness.releasePendingOffers,
  });

  assert.equal(harness.calls.createAuthorization.length, 0);
  assert.deepEqual(
    harness.calls.retrieveAuthorization,
    ["pi_existing_test"]
  );
});

test("requires_capture becomes canonical authorized state", async () => {
  const { authorizeSecureHold } = loadSecureHoldService();

  const harness = createHarness({
    runOverrides: {
      paymentIntentId: "pi_existing_test",
    },
  });

  const result = await authorizeSecureHold({
    run: harness.run,
    prisma: harness.prisma,
    paymentService: harness.paymentService,
    releasePendingOffers: harness.releasePendingOffers,
  });

  assert.equal(result.state, "authorized");
  assert.equal(result.clientSecret, null);
  assert.equal(result.run.authorizationStatus, "authorized");
  assert.equal(result.run.paymentStatus, "authorized");
});

test("verified authorization releases pending offers exactly once", async () => {
  const { authorizeSecureHold } = loadSecureHoldService();

  const harness = createHarness({
    runOverrides: {
      paymentIntentId: "pi_existing_test",
    },
  });

  await authorizeSecureHold({
    run: harness.run,
    prisma: harness.prisma,
    paymentService: harness.paymentService,
    releasePendingOffers: harness.releasePendingOffers,
  });

  assert.deepEqual(
    harness.calls.releasePendingOffers,
    ["run-123"]
  );
});

test("provider failure never releases pending offers", async () => {
  const { authorizeSecureHold } = loadSecureHoldService();

  const harness = createHarness();

  harness.paymentService.createAuthorization = async () => {
    throw new Error("provider authorization failed");
  };

  await assert.rejects(
    () =>
      authorizeSecureHold({
        run: harness.run,
        prisma: harness.prisma,
        paymentService: harness.paymentService,
        releasePendingOffers: harness.releasePendingOffers,
      }),
    /provider authorization failed/i
  );

  assert.equal(harness.calls.releasePendingOffers.length, 0);
});

test("already-authorized run is idempotent and performs no provider mutation", async () => {
  const { authorizeSecureHold } = loadSecureHoldService();

  const harness = createHarness({
    runOverrides: {
      paymentIntentId: "pi_existing_test",
      authorizationStatus: "authorized",
      paymentStatus: "authorized",
    },
  });

  const result = await authorizeSecureHold({
    run: harness.run,
    prisma: harness.prisma,
    paymentService: harness.paymentService,
    releasePendingOffers: harness.releasePendingOffers,
  });

  assert.equal(result.state, "authorized");
  assert.equal(result.clientSecret, null);

  assert.equal(harness.calls.createAuthorization.length, 0);
  assert.equal(harness.calls.retrieveAuthorization.length, 0);
  assert.equal(harness.calls.update.length, 0);
  assert.equal(harness.calls.releasePendingOffers.length, 0);
});
