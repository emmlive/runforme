const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assertRunnerPayoutEligibility,
  payoutIdempotencyKey,
  prepareRunnerPayout,
} = require("./runnerPayoutFoundation");

function eligibleRun(overrides = {}) {
  return {
    id: 3,
    assignedRunnerId: 12,
    status: "completed",
    paymentStatus: "captured",
    payoutStatus: "ready_for_payout",
    runnerPayout: 5,
    ...overrides,
  };
}

function readyRunner(overrides = {}) {
  return {
    id: 12,
    role: "runner",
    stripeConnectedAccountId: "acct_runner_123",
    payoutOnboardingStatus: "ready",
    ...overrides,
  };
}

test("payout eligibility requires completed captured ready-for-payout run owned by runner", () => {
  const result = assertRunnerPayoutEligibility({
    run: eligibleRun(),
    runner: readyRunner(),
  });

  assert.deepEqual(result, {
    amount: 5,
    connectedAccountId: "acct_runner_123",
  });
});

test("payout eligibility blocks a different runner", () => {
  assert.throws(
    () =>
      assertRunnerPayoutEligibility({
        run: eligibleRun(),
        runner: readyRunner({ id: 99 }),
      }),
    /not assigned/
  );
});

test("payout eligibility requires payout onboarding readiness", () => {
  assert.throws(
    () =>
      assertRunnerPayoutEligibility({
        run: eligibleRun(),
        runner: readyRunner({ payoutOnboardingStatus: "pending" }),
      }),
    /not ready/
  );
});

test("payout idempotency key is stable per runner and run", () => {
  assert.equal(
    payoutIdempotencyKey({ runnerId: 12, runId: 3 }),
    "runner:12:run:3:payout"
  );
});

test("prepare payout creates a prepared ledger record without provider transfer", async () => {
  let createdData = null;

  const prisma = {
    runnerPayout: {
      async findUnique() {
        return null;
      },
      async create({ data }) {
        createdData = data;
        return { id: 1, ...data };
      },
    },
  };

  const result = await prepareRunnerPayout({
    prisma,
    run: eligibleRun(),
    runner: readyRunner(),
    currency: "USD",
  });

  assert.equal(result.alreadyPrepared, false);
  assert.equal(result.payout.status, "prepared");
  assert.equal(result.payout.providerTransferId, null);
  assert.equal(createdData.idempotencyKey, "runner:12:run:3:payout");
});

test("prepare payout is idempotent when the run already has a matching ledger row", async () => {
  let creates = 0;

  const existing = {
    id: 7,
    runnerId: 12,
    runId: 3,
    amount: 5,
    currency: "usd",
    status: "prepared",
    idempotencyKey: "runner:12:run:3:payout",
    providerTransferId: null,
  };

  const prisma = {
    runnerPayout: {
      async findUnique() {
        return existing;
      },
      async create() {
        creates += 1;
      },
    },
  };

  const result = await prepareRunnerPayout({
    prisma,
    run: eligibleRun(),
    runner: readyRunner(),
    currency: "usd",
  });

  assert.equal(result.alreadyPrepared, true);
  assert.equal(result.payout.id, 7);
  assert.equal(creates, 0);
});
