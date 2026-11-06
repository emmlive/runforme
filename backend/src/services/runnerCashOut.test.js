const test = require("node:test");
const assert = require("node:assert/strict");

const {
  executeRunnerCashOut,
} = require("./runnerCashOut");

function buildRunner(overrides = {}) {
  return {
    id: 12,
    role: "runner",
    stripeConnectedAccountId: "acct_runner_12",
    payoutOnboardingStatus: "ready",
    ...overrides,
  };
}

function buildRun(overrides = {}) {
  return {
    id: 3,
    assignedRunnerId: 12,
    status: "completed",
    paymentStatus: "captured",
    payoutStatus: "ready_for_payout",
    runnerPayout: 5,
    paymentIntentId: "pi_run_3",
    ...overrides,
  };
}

test("cash out creates one source-transaction transfer for canonical runner amount", async () => {
  const calls = [];
  const prisma = {
    runnerPayout: {
      async findUnique() {
        return null;
      },
      async create({ data }) {
        return { id: 44, ...data };
      },
      async update({ data }) {
        return { id: 44, runnerId: 12, runId: 3, amount: 5, currency: "usd", idempotencyKey: "runner:12:run:3:payout", ...data };
      },
    },
    run: {
      async update(args) {
        calls.push(["run.update", args]);
        return args.data;
      },
    },
  };

  const stripe = {
    paymentIntents: {
      async retrieve(id) {
        assert.equal(id, "pi_run_3");
        return {
          id,
          status: "succeeded",
          latest_charge: "ch_run_3",
        };
      },
    },
    transfers: {
      async create(data, options) {
        calls.push(["transfer", data, options]);
        return { id: "tr_run_3" };
      },
    },
  };

  const result = await executeRunnerCashOut({
    prisma,
    run: buildRun(),
    runner: buildRunner(),
    currency: "usd",
    stripe,
  });

  const transferCall = calls.find(([name]) => name === "transfer");
  assert.equal(transferCall[1].amount, 500);
  assert.equal(transferCall[1].currency, "usd");
  assert.equal(transferCall[1].destination, "acct_runner_12");
  assert.equal(transferCall[1].source_transaction, "ch_run_3");
  assert.equal(
    transferCall[2].idempotencyKey,
    "runner:12:run:3:payout:transfer"
  );
  assert.equal(result.payout.providerTransferId, "tr_run_3");
  assert.equal(result.payout.status, "transferred");
  assert.equal(result.alreadyTransferred, false);
});

test("cash out requires succeeded captured PaymentIntent", async () => {
  const prisma = {
    runnerPayout: {
      async findUnique() {
        return null;
      },
      async create({ data }) {
        return { id: 44, ...data };
      },
      async update() {
        throw new Error("should not update");
      },
    },
    run: { async update() {} },
  };

  const stripe = {
    paymentIntents: {
      async retrieve() {
        return { status: "requires_capture", latest_charge: "ch_run_3" };
      },
    },
    transfers: {
      async create() {
        throw new Error("should not transfer");
      },
    },
  };

  await assert.rejects(
    () =>
      executeRunnerCashOut({
        prisma,
        run: buildRun(),
        runner: buildRunner(),
        currency: "usd",
        stripe,
      }),
    /not in succeeded status/
  );
});

test("cash out requires source charge from PaymentIntent", async () => {
  const prisma = {
    runnerPayout: {
      async findUnique() {
        return null;
      },
      async create({ data }) {
        return { id: 44, ...data };
      },
      async update() {
        throw new Error("should not update");
      },
    },
    run: { async update() {} },
  };

  const stripe = {
    paymentIntents: {
      async retrieve() {
        return { status: "succeeded", latest_charge: null };
      },
    },
    transfers: {
      async create() {
        throw new Error("should not transfer");
      },
    },
  };

  await assert.rejects(
    () =>
      executeRunnerCashOut({
        prisma,
        run: buildRun(),
        runner: buildRunner(),
        currency: "usd",
        stripe,
      }),
    /does not have a source charge/
  );
});

test("cash out returns idempotently when ledger already transferred", async () => {
  let transferCalls = 0;
  const existing = {
    id: 44,
    runnerId: 12,
    runId: 3,
    amount: 5,
    currency: "usd",
    status: "transferred",
    idempotencyKey: "runner:12:run:3:payout",
    providerTransferId: "tr_existing",
  };

  const prisma = {
    runnerPayout: {
      async findUnique() {
        return existing;
      },
      async create() {
        throw new Error("should not create");
      },
      async update() {
        throw new Error("should not update payout");
      },
    },
    run: {
      async update() {
        return { payoutStatus: "transferred" };
      },
    },
  };

  const stripe = {
    paymentIntents: {
      async retrieve() {
        throw new Error("should not retrieve");
      },
    },
    transfers: {
      async create() {
        transferCalls += 1;
      },
    },
  };

  const result = await executeRunnerCashOut({
    prisma,
    run: buildRun({ payoutStatus: "ready_for_payout" }),
    runner: buildRunner(),
    currency: "usd",
    stripe,
  });

  assert.equal(transferCalls, 0);
  assert.equal(result.alreadyTransferred, true);
  assert.equal(result.payout.providerTransferId, "tr_existing");
});
