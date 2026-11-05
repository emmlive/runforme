const test = require("node:test");
const assert = require("node:assert/strict");

const {
  classifyOnboardingStatus,
  createRunnerOnboardingLink,
  ensureRunnerConnectedAccount,
  refreshRunnerOnboardingStatus,
} = require("./runnerConnectOnboarding");

function runner(overrides = {}) {
  return {
    id: 12,
    role: "runner",
    stripeConnectedAccountId: null,
    payoutOnboardingStatus: "not_started",
    ...overrides,
  };
}

test("ready requires active transfers and submitted details", () => {
  assert.equal(
    classifyOnboardingStatus({
      capabilities: { transfers: "active" },
      details_submitted: true,
      requirements: { past_due: [] },
    }),
    "ready"
  );
});

test("restricted reflects Stripe requirement blocking state", () => {
  assert.equal(
    classifyOnboardingStatus({
      capabilities: { transfers: "inactive" },
      details_submitted: false,
      requirements: { disabled_reason: "requirements.past_due", past_due: ["individual.id_number"] },
    }),
    "restricted"
  );
});

test("new runner account uses controller properties and transfers-only capability", async () => {
  let createArgs = null;
  let updateArgs = null;

  const stripe = {
    accounts: {
      async create(args) {
        createArgs = args;
        return {
          id: "acct_runner_12",
          capabilities: { transfers: "pending" },
          details_submitted: false,
          requirements: { past_due: [] },
        };
      },
    },
  };

  const prisma = {
    user: {
      async update(args) {
        updateArgs = args;
        return args.data;
      },
    },
  };

  const result = await ensureRunnerConnectedAccount({
    prisma,
    runner: runner(),
    stripe,
  });

  assert.equal(result.created, true);
  assert.equal(createArgs.country, "US");
  assert.deepEqual(createArgs.capabilities, {
    transfers: { requested: true },
  });
  assert.equal(createArgs.controller.stripe_dashboard.type, "express");
  assert.equal(createArgs.controller.fees.payer, "application");
  assert.equal(createArgs.controller.losses.payments, "application");
  assert.equal(createArgs.controller.requirement_collection, "stripe");
  assert.equal("type" in createArgs, false);
  assert.equal("card_payments" in createArgs.capabilities, false);
  assert.equal(updateArgs.data.stripeConnectedAccountId, "acct_runner_12");
});

test("existing connected account is reused instead of duplicated", async () => {
  let creates = 0;

  const stripe = {
    accounts: {
      async create() {
        creates += 1;
      },
      async retrieve(id) {
        assert.equal(id, "acct_existing");
        return {
          id,
          capabilities: { transfers: "active" },
          details_submitted: true,
          requirements: { past_due: [] },
        };
      },
    },
  };

  const prisma = {
    user: {
      async update() {},
    },
  };

  const result = await ensureRunnerConnectedAccount({
    prisma,
    runner: runner({
      stripeConnectedAccountId: "acct_existing",
      payoutOnboardingStatus: "ready",
    }),
    stripe,
  });

  assert.equal(result.created, false);
  assert.equal(result.status, "ready");
  assert.equal(creates, 0);
});

test("hosted onboarding link is created for runner account", async () => {
  const stripe = {
    accounts: {
      async create() {
        return {
          id: "acct_runner_12",
          capabilities: { transfers: "pending" },
          details_submitted: false,
          requirements: { past_due: [] },
        };
      },
    },
    accountLinks: {
      async create(args) {
        assert.equal(args.account, "acct_runner_12");
        assert.equal(args.type, "account_onboarding");
        assert.equal(args.return_url, "https://app.example.com/runner?payout=return");
        assert.equal(args.refresh_url, "https://app.example.com/runner?payout=refresh");
        return { url: "https://connect.stripe.test/onboard" };
      },
    },
  };

  const prisma = {
    user: {
      async update() {},
    },
  };

  const result = await createRunnerOnboardingLink({
    runner: runner(),
    prisma,
    returnUrl: "https://app.example.com/runner?payout=return",
    refreshUrl: "https://app.example.com/runner?payout=refresh",
    stripe,
  });

  assert.equal(result.url, "https://connect.stripe.test/onboard");
});

test("status refresh reports transfer readiness without bank details", async () => {
  const stripe = {
    accounts: {
      async retrieve() {
        return {
          id: "acct_runner_12",
          capabilities: { transfers: "active" },
          details_submitted: true,
          requirements: { past_due: [] },
        };
      },
    },
  };

  const prisma = {
    user: {
      async update() {},
    },
  };

  const result = await refreshRunnerOnboardingStatus({
    runner: runner({
      stripeConnectedAccountId: "acct_runner_12",
      payoutOnboardingStatus: "pending",
    }),
    prisma,
    stripe,
  });

  assert.deepEqual(result, {
    connected: true,
    accountId: "acct_runner_12",
    status: "ready",
    transfersEnabled: true,
    detailsSubmitted: true,
  });
});
