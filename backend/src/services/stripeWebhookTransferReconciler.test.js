const test = require("node:test");
const assert = require("node:assert/strict");

const {
  reconcileStripeEvent,
} = require("./stripeWebhookReconciler");

function transferEvent({
  id = "evt_transfer_1",
  type = "transfer.created",
  transferId = "tr_test_1",
  amount = 500,
  amountReversed = 0,
  reversed = false,
} = {}) {
  return {
    id,
    type,
    data: {
      object: {
        id: transferId,
        amount,
        amount_reversed: amountReversed,
        reversed,
      },
    },
  };
}

function createTransferHarness({
  existingEvent = null,
  payout = {
    id: 1,
    runnerId: 12,
    runId: 3,
    amount: 5,
    currency: "usd",
    status: "transferred",
    providerTransferId: "tr_test_1",
    failureCode: null,
  },
  run = {
    id: 3,
    payoutStatus: "transferred",
  },
} = {}) {
  let storedEvent = existingEvent;
  let storedPayout = payout ? { ...payout } : null;
  let storedRun = run ? { ...run } : null;

  const calls = {
    payoutFindUnique: [],
    payoutUpdate: [],
    runUpdate: [],
    eventCreate: [],
    eventUpdate: [],
  };

  const prisma = {
    stripeWebhookEvent: {
      async findUnique({ where }) {
        if (storedEvent?.id === where.id) {
          return { ...storedEvent };
        }

        return null;
      },

      async create({ data }) {
        calls.eventCreate.push(data);
        storedEvent = { ...data };
        return { ...storedEvent };
      },

      async update({ data }) {
        calls.eventUpdate.push(data);
        storedEvent = {
          ...storedEvent,
          ...data,
        };
        return { ...storedEvent };
      },
    },

    runnerPayout: {
      async findUnique(args) {
        calls.payoutFindUnique.push(args);

        if (
          storedPayout &&
          args?.where?.providerTransferId ===
            storedPayout.providerTransferId
        ) {
          return { ...storedPayout };
        }

        return null;
      },

      async update({ data }) {
        calls.payoutUpdate.push(data);
        storedPayout = {
          ...storedPayout,
          ...data,
        };
        return { ...storedPayout };
      },
    },

    run: {
      async findFirst() {
        throw new Error(
          "PaymentIntent lookup must not be used for Transfer events"
        );
      },

      async update({ data }) {
        calls.runUpdate.push(data);
        storedRun = {
          ...storedRun,
          ...data,
        };
        return { ...storedRun };
      },
    },
  };

  return {
    prisma,
    calls,
    getEvent: () => storedEvent,
    getPayout: () => storedPayout,
    getRun: () => storedRun,
  };
}

test("transfer.created reconciles by providerTransferId", async () => {
  const event = transferEvent({
    id: "evt_transfer_created",
    type: "transfer.created",
  });
  const harness = createTransferHarness();

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.applied, true);
  assert.equal(result.deduped, false);
  assert.deepEqual(
    harness.calls.payoutFindUnique[0],
    {
      where: {
        providerTransferId: "tr_test_1",
      },
    }
  );
  assert.equal(harness.getPayout().status, "transferred");
  assert.equal(harness.getPayout().failureCode, null);
  assert.equal(harness.getRun().payoutStatus, "transferred");
  assert.equal(harness.getEvent().runId, 3);
  assert.equal(harness.getEvent().applied, true);
});

test("full transfer.reversed marks payout and run reversed", async () => {
  const event = transferEvent({
    id: "evt_transfer_reversed",
    type: "transfer.reversed",
    amountReversed: 500,
    reversed: true,
  });
  const harness = createTransferHarness();

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.applied, true);
  assert.equal(harness.getPayout().status, "reversed");
  assert.equal(
    harness.getPayout().failureCode,
    "stripe_transfer_reversed"
  );
  assert.equal(harness.getRun().payoutStatus, "reversed");
});

test("partial transfer.reversed records partially_reversed", async () => {
  const event = transferEvent({
    id: "evt_transfer_partial_reversal",
    type: "transfer.reversed",
    amountReversed: 200,
    reversed: false,
  });
  const harness = createTransferHarness();

  await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(
    harness.getPayout().status,
    "partially_reversed"
  );
  assert.equal(
    harness.getPayout().failureCode,
    "stripe_transfer_partially_reversed"
  );
  assert.equal(
    harness.getRun().payoutStatus,
    "partially_reversed"
  );
});

test("late transfer.updated cannot regress a reversed payout", async () => {
  const event = transferEvent({
    id: "evt_transfer_late_update",
    type: "transfer.updated",
  });
  const harness = createTransferHarness({
    payout: {
      id: 1,
      runnerId: 12,
      runId: 3,
      amount: 5,
      currency: "usd",
      status: "reversed",
      providerTransferId: "tr_test_1",
      failureCode: "stripe_transfer_reversed",
    },
    run: {
      id: 3,
      payoutStatus: "reversed",
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.applied, true);
  assert.equal(harness.calls.payoutUpdate.length, 0);
  assert.equal(harness.calls.runUpdate.length, 0);
  assert.equal(harness.getPayout().status, "reversed");
  assert.equal(harness.getRun().payoutStatus, "reversed");
});

test("duplicate applied transfer event is idempotent", async () => {
  const event = transferEvent({
    id: "evt_transfer_duplicate",
    type: "transfer.created",
  });
  const harness = createTransferHarness({
    existingEvent: {
      id: event.id,
      type: event.type,
      runId: 3,
      applied: true,
      rawEvent: event,
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.deduped, true);
  assert.equal(result.applied, false);
  assert.equal(harness.calls.payoutFindUnique.length, 0);
  assert.equal(harness.calls.payoutUpdate.length, 0);
  assert.equal(harness.calls.runUpdate.length, 0);
});

test("unmapped transfer event cannot mutate unrelated payout", async () => {
  const event = transferEvent({
    id: "evt_transfer_unmapped",
    type: "transfer.updated",
    transferId: "tr_missing",
  });
  const harness = createTransferHarness();

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.applied, false);
  assert.match(result.reason, /mapping|not found/i);
  assert.equal(harness.calls.payoutUpdate.length, 0);
  assert.equal(harness.calls.runUpdate.length, 0);
});
