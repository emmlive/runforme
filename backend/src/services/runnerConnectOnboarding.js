const createStripeClient = require("stripe");
const {
  assertPaymentRuntimeAuthorized,
} = require("./paymentRuntimeGuard");

function normalize(value) {
  return String(value || "").trim();
}

function requireDependency(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function assertRunnerAccount(runner) {
  requireDependency(runner, "runner");

  if (runner.role !== "runner") {
    throw new Error("Only runner accounts can use payout onboarding");
  }

  return runner;
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Stripe payment provider is not configured");
  }

  assertPaymentRuntimeAuthorized({
    nodeEnv: process.env.NODE_ENV,
    stripeSecretKey: secretKey,
    livePaymentsAuthorized:
      process.env.RUNFORME_LIVE_PAYMENTS_AUTHORIZED,
  });

  return createStripeClient(secretKey);
}

function classifyOnboardingStatus(account) {
  if (!account) return "not_started";

  const transfersStatus =
    account.capabilities?.transfers || "inactive";

  if (
    transfersStatus === "active" &&
    account.details_submitted === true
  ) {
    return "ready";
  }

  if (
    account.requirements?.disabled_reason ||
    account.requirements?.past_due?.length > 0
  ) {
    return "restricted";
  }

  return "pending";
}

async function ensureRunnerConnectedAccount({
  prisma,
  runner,
  stripe = getStripeClient(),
}) {
  assertRunnerAccount(runner);
  requireDependency(prisma?.user?.update, "prisma.user.update");

  if (runner.stripeConnectedAccountId) {
    const existing = await stripe.accounts.retrieve(
      runner.stripeConnectedAccountId
    );

    const status = classifyOnboardingStatus(existing);

    if (status !== runner.payoutOnboardingStatus) {
      await prisma.user.update({
        where: { id: runner.id },
        data: { payoutOnboardingStatus: status },
      });
    }

    return {
      account: existing,
      created: false,
      status,
    };
  }

  const account = await stripe.accounts.create({
    country: "US",
    capabilities: {
      transfers: {
        requested: true,
      },
    },
    controller: {
      stripe_dashboard: {
        type: "express",
      },
      fees: {
        payer: "application",
      },
      losses: {
        payments: "application",
      },
      requirement_collection: "stripe",
    },
    metadata: {
      runformeRunnerId: String(runner.id),
    },
  });

  const status = classifyOnboardingStatus(account);

  await prisma.user.update({
    where: { id: runner.id },
    data: {
      stripeConnectedAccountId: account.id,
      payoutOnboardingStatus: status,
    },
  });

  return {
    account,
    created: true,
    status,
  };
}

async function createRunnerOnboardingLink({
  runner,
  prisma,
  returnUrl,
  refreshUrl,
  stripe = getStripeClient(),
}) {
  const normalizedReturnUrl = normalize(returnUrl);
  const normalizedRefreshUrl = normalize(refreshUrl);

  if (!normalizedReturnUrl || !normalizedRefreshUrl) {
    throw new Error("Payout onboarding return URLs are required");
  }

  const ensured = await ensureRunnerConnectedAccount({
    prisma,
    runner,
    stripe,
  });

  const link = await stripe.accountLinks.create({
    account: ensured.account.id,
    refresh_url: normalizedRefreshUrl,
    return_url: normalizedReturnUrl,
    type: "account_onboarding",
  });

  return {
    url: link.url,
    accountId: ensured.account.id,
    status: ensured.status,
    created: ensured.created,
  };
}

async function refreshRunnerOnboardingStatus({
  runner,
  prisma,
  stripe = getStripeClient(),
}) {
  assertRunnerAccount(runner);

  if (!runner.stripeConnectedAccountId) {
    return {
      connected: false,
      accountId: null,
      status: "not_started",
      transfersEnabled: false,
      detailsSubmitted: false,
    };
  }

  const account = await stripe.accounts.retrieve(
    runner.stripeConnectedAccountId
  );

  const status = classifyOnboardingStatus(account);

  if (status !== runner.payoutOnboardingStatus) {
    await prisma.user.update({
      where: { id: runner.id },
      data: { payoutOnboardingStatus: status },
    });
  }

  return {
    connected: true,
    accountId: account.id,
    status,
    transfersEnabled:
      account.capabilities?.transfers === "active",
    detailsSubmitted: account.details_submitted === true,
  };
}

module.exports = {
  classifyOnboardingStatus,
  createRunnerOnboardingLink,
  ensureRunnerConnectedAccount,
  refreshRunnerOnboardingStatus,
};
