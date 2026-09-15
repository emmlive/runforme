const assert = require("node:assert/strict");
const test = require("node:test");

function loadSettlementService() {
  try {
    return require("./runPaymentSettlement");
  } catch (error) {
    assert.fail(
      `runPaymentSettlement implementation is required for this contract: ${error.code || error.message}`
    );
  }
}

function createHarness({
  runOverrides = {},
  captureResult = {
    id: "pi_capture_test",
    status: "succeeded",
  },
  cancelResult = {
    id: "pi_cancel_test",
    status: "canceled",
  },
} = {}) {
  const run = {
    id: "run-123",
    paymentIntentId: "pi_capture_test",
    authorizationStatus: "authorized",
    paymentStatus: "authorized",
    receiptStatus: "uploaded",
    receiptAmount: 10,
    runnerPayout: 5,
    platformFee: 3,
    holdAmount: 25,
    deliveryConfirmedAt: "2026-09-14T19:00:00.000Z",
    requiresManualReview: false,
    payoutStatus: "not_ready",
    ...runOverrides,
  };

  const calls = {
    captureAuthorization: [],
    cancelAuthorization: [],
    update: [],
  };

  const paymentService = {
    async captureAuthorization(args) {
      calls.captureAuthorization.push(args);
      return captureResult;
    },

    async cancelAuthorization(args) {
      calls.cancelAuthorization.push(args);
      return cancelResult;
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

  return {
    run,
    calls,
    paymentService,
    prisma,
  };
}

test("successful settlement captures exact server-computed final amount", async () => {
  const { captureRunPayment } = loadSettlementService();
  const harness = createHarness();

  const result = await captureRunPayment({
    run: harness.run,
    prisma: harness.prisma,
    paymentService: harness.paymentService,
  });

  assert.deepEqual(
    harness.calls.captureAuthorization,
    [
      {
        paymentIntentId: "pi_capture_test",
        runId: "run-123",
        amount: 18,
      },
    ]
  );

  assert.equal(result.captureAmount, 18);
});

test("successful provider capture marks payment captured and payout ready", async () => {
  const { captureRunPayment } = loadSettlementService();
  const harness = createHarness();

  const result = await captureRunPayment({
    run: harness.run,
    prisma: harness.prisma,
    paymentService: harness.paymentService,
  });

  assert.equal(result.run.paymentStatus, "captured");
  assert.equal(result.run.payoutStatus, "ready_for_payout");

  assert.equal(
    harness.calls.update.some(
      (entry) =>
        entry.data?.paymentStatus === "captured" &&
        entry.data?.payoutStatus === "ready_for_payout"
    ),
    true
  );
});

test("capture is blocked before delivery confirmation", async () => {
  const { captureRunPayment } = loadSettlementService();

  const harness = createHarness({
    runOverrides: {
      deliveryConfirmedAt: null,
    },
  });

  await assert.rejects(
    () =>
      captureRunPayment({
        run: harness.run,
        prisma: harness.prisma,
        paymentService: harness.paymentService,
      }),
    /delivery/i
  );

  assert.equal(harness.calls.captureAuthorization.length, 0);
});

test("capture above the authorized hold fails closed without provider call", async () => {
  const { captureRunPayment } = loadSettlementService();

  const harness = createHarness({
    runOverrides: {
      receiptAmount: 20,
      runnerPayout: 5,
      platformFee: 3,
      holdAmount: 25,
    },
  });

  await assert.rejects(
    () =>
      captureRunPayment({
        run: harness.run,
        prisma: harness.prisma,
        paymentService: harness.paymentService,
      }),
    /hold|manual/i
  );

  assert.equal(harness.calls.captureAuthorization.length, 0);
});

test("manual review blocks capture and payout readiness", async () => {
  const { captureRunPayment } = loadSettlementService();

  const harness = createHarness({
    runOverrides: {
      requiresManualReview: true,
    },
  });

  await assert.rejects(
    () =>
      captureRunPayment({
        run: harness.run,
        prisma: harness.prisma,
        paymentService: harness.paymentService,
      }),
    /manual/i
  );

  assert.equal(harness.calls.captureAuthorization.length, 0);
  assert.notEqual(
    harness.run.payoutStatus,
    "ready_for_payout"
  );
});

test("provider capture failure never marks payout ready", async () => {
  const { captureRunPayment } = loadSettlementService();
  const harness = createHarness();

  harness.paymentService.captureAuthorization = async (args) => {
    harness.calls.captureAuthorization.push(args);
    throw new Error("provider capture failed");
  };

  await assert.rejects(
    () =>
      captureRunPayment({
        run: harness.run,
        prisma: harness.prisma,
        paymentService: harness.paymentService,
      }),
    /provider capture failed/i
  );

  assert.notEqual(
    harness.run.payoutStatus,
    "ready_for_payout"
  );

  assert.equal(
    harness.calls.update.some(
      (entry) => entry.data?.payoutStatus === "ready_for_payout"
    ),
    false
  );
});

test("non-succeeded provider result fails closed", async () => {
  const { captureRunPayment } = loadSettlementService();

  const harness = createHarness({
    captureResult: {
      id: "pi_capture_test",
      status: "requires_capture",
    },
  });

  await assert.rejects(
    () =>
      captureRunPayment({
        run: harness.run,
        prisma: harness.prisma,
        paymentService: harness.paymentService,
      }),
    /capture|provider|succeeded/i
  );

  assert.notEqual(
    harness.run.payoutStatus,
    "ready_for_payout"
  );
});

test("already captured payment is idempotent and performs no provider mutation", async () => {
  const { captureRunPayment } = loadSettlementService();

  const harness = createHarness({
    runOverrides: {
      paymentStatus: "captured",
      payoutStatus: "ready_for_payout",
    },
  });

  const result = await captureRunPayment({
    run: harness.run,
    prisma: harness.prisma,
    paymentService: harness.paymentService,
  });

  assert.equal(result.run.paymentStatus, "captured");
  assert.equal(result.run.payoutStatus, "ready_for_payout");
  assert.equal(harness.calls.captureAuthorization.length, 0);
  assert.equal(harness.calls.update.length, 0);
});

test("release cancels an outstanding authorization before completion", async () => {
  const { releaseRunAuthorization } = loadSettlementService();

  const harness = createHarness({
    runOverrides: {
      paymentIntentId: "pi_cancel_test",
      authorizationStatus: "authorized",
      paymentStatus: "authorized",
      payoutStatus: "not_ready",
    },
  });

  const result = await releaseRunAuthorization({
    run: harness.run,
    prisma: harness.prisma,
    paymentService: harness.paymentService,
  });

  assert.deepEqual(
    harness.calls.cancelAuthorization,
    [
      {
        paymentIntentId: "pi_cancel_test",
        runId: "run-123",
      },
    ]
  );

  assert.equal(result.run.authorizationStatus, "canceled");
  assert.equal(result.run.paymentStatus, "canceled");
  assert.notEqual(result.run.payoutStatus, "ready_for_payout");
});

test("release never cancels an already captured payment", async () => {
  const { releaseRunAuthorization } = loadSettlementService();

  const harness = createHarness({
    runOverrides: {
      paymentStatus: "captured",
      payoutStatus: "ready_for_payout",
    },
  });

  await assert.rejects(
    () =>
      releaseRunAuthorization({
        run: harness.run,
        prisma: harness.prisma,
        paymentService: harness.paymentService,
      }),
    /captured|release|cancel/i
  );

  assert.equal(harness.calls.cancelAuthorization.length, 0);
});
