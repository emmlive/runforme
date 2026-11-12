const test = require("node:test");
const assert = require("node:assert/strict");

const {
  reconcileStripeEvent,
} = require("./stripeWebhookReconciler");

function payoutEvent({
  id = "evt_payout_1",
  type = "payout.created",
  account = "acct_runner_12",
  payoutId = "po_test_1",
  amount = 500,
  currency = "usd",
  status = "pending",
  arrivalDate = 1794355200,
  failureCode = null,
} = {}) {
  return {
    id,
    type,
    account,
    data: {
      object: {
        id: payoutId,
        amount,
        currency,
        status,
        arrival_date: arrivalDate,
        failure_code: failureCode,
      },
    },
  };
}

function createHarness({
  existingEvent = null,
  runner = {
    id: 12,
    role: "runner",
    stripeConnectedAccountId: "acct_runner_12",
  },
  bankPayout = null,
} = {}) {
  let storedEvent = existingEvent;
  let storedBankPayout = bankPayout ? { ...bankPayout } : null;

  const calls = {
    eventCreate: [],
    eventUpdate: [],
    userFindUnique: [],
    bankFindUnique: [],
    bankUpsert: [],
  };

  const prisma = {
    stripeWebhookEvent: {
      async findUnique({ where }) {
        return storedEvent?.id === where.id
          ? { ...storedEvent }
          : null;
      },
      async create({ data }) {
        calls.eventCreate.push(data);
        storedEvent = { ...data };
        return { ...storedEvent };
      },
      async update({ data }) {
        calls.eventUpdate.push(data);
        storedEvent = { ...storedEvent, ...data };
        return { ...storedEvent };
      },
    },
    user: {
      async findUnique(args) {
        calls.userFindUnique.push(args);
        return (
          runner &&
          args?.where?.stripeConnectedAccountId ===
            runner.stripeConnectedAccountId
        )
          ? { ...runner }
          : null;
      },
    },
    runnerBankPayout: {
      async findUnique(args) {
        calls.bankFindUnique.push(args);
        return (
          storedBankPayout &&
          args?.where?.providerPayoutId ===
            storedBankPayout.providerPayoutId
        )
          ? { ...storedBankPayout }
          : null;
      },
      async upsert(args) {
        calls.bankUpsert.push(args);
        storedBankPayout = storedBankPayout
          ? { ...storedBankPayout, ...args.update }
          : { id: 1, ...args.create };
        return { ...storedBankPayout };
      },
    },
    run: {
      async findFirst() {
        throw new Error("bank payout events must not use Run mapping");
      },
      async update() {
        throw new Error("bank payout events must not mutate Run");
      },
    },
  };

  return {
    prisma,
    calls,
    getEvent: () => storedEvent,
    getBankPayout: () => storedBankPayout,
  };
}

test("payout.created maps connected account to runner and records pending payout", async () => {
  const event = payoutEvent();
  const harness = createHarness();

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.applied, true);
  assert.equal(result.deduped, false);
  assert.deepEqual(
    harness.calls.userFindUnique[0],
    {
      where: {
        stripeConnectedAccountId: "acct_runner_12",
      },
    }
  );
  assert.equal(harness.getBankPayout().runnerId, 12);
  assert.equal(harness.getBankPayout().providerPayoutId, "po_test_1");
  assert.equal(harness.getBankPayout().amountMinor, 500);
  assert.equal(harness.getBankPayout().currency, "usd");
  assert.equal(harness.getBankPayout().status, "pending");
  assert.equal(harness.getEvent().applied, true);
  assert.equal(harness.getEvent().runId, null);
});

test("payout.paid records terminal paid state", async () => {
  const event = payoutEvent({
    id: "evt_payout_paid",
    type: "payout.paid",
    status: "paid",
  });
  const harness = createHarness();

  await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(harness.getBankPayout().status, "paid");
  assert.equal(harness.getBankPayout().failureCode, null);
});

test("payout.failed records failure code", async () => {
  const event = payoutEvent({
    id: "evt_payout_failed",
    type: "payout.failed",
    status: "failed",
    failureCode: "account_closed",
  });
  const harness = createHarness();

  await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(harness.getBankPayout().status, "failed");
  assert.equal(
    harness.getBankPayout().failureCode,
    "account_closed"
  );
});

test("late payout.updated cannot regress terminal paid state", async () => {
  const event = payoutEvent({
    id: "evt_payout_late_update",
    type: "payout.updated",
    status: "in_transit",
  });
  const harness = createHarness({
    bankPayout: {
      id: 1,
      runnerId: 12,
      providerPayoutId: "po_test_1",
      amountMinor: 500,
      currency: "usd",
      status: "paid",
      arrivalDate: null,
      failureCode: null,
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.applied, true);
  assert.equal(harness.calls.bankUpsert.length, 0);
  assert.equal(harness.getBankPayout().status, "paid");
});

test("unmapped connected account payout fails closed", async () => {
  const event = payoutEvent({
    id: "evt_payout_unmapped",
    account: "acct_unknown",
  });
  const harness = createHarness();

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.applied, false);
  assert.match(result.reason, /runner mapping/i);
  assert.equal(harness.calls.bankUpsert.length, 0);
});

test("non-runner connected account payout fails closed", async () => {
  const event = payoutEvent({
    id: "evt_payout_nonrunner",
  });
  const harness = createHarness({
    runner: {
      id: 12,
      role: "requester",
      stripeConnectedAccountId: "acct_runner_12",
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.applied, false);
  assert.equal(harness.calls.bankUpsert.length, 0);
});

test("duplicate applied payout event is idempotent", async () => {
  const event = payoutEvent({
    id: "evt_payout_duplicate",
  });
  const harness = createHarness({
    existingEvent: {
      id: event.id,
      type: event.type,
      runId: null,
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
  assert.equal(harness.calls.userFindUnique.length, 0);
  assert.equal(harness.calls.bankUpsert.length, 0);
});
