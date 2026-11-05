function requireDependency(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function normalizeCurrency(value) {
  const currency = String(value || "").trim().toLowerCase();

  if (!currency) {
    throw new Error("Payout currency is required");
  }

  return currency;
}

function requirePositiveWholeDollarAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Runner payout must be a positive whole-dollar integer");
  }

  return amount;
}

function payoutIdempotencyKey({ runnerId, runId }) {
  if (!runnerId) throw new Error("runnerId is required");
  if (!runId) throw new Error("runId is required");

  return `runner:${runnerId}:run:${runId}:payout`;
}

function assertRunnerPayoutEligibility({ run, runner }) {
  requireDependency(run, "run");
  requireDependency(runner, "runner");

  if (runner.role !== "runner") {
    throw new Error("Only runner accounts can receive runner payouts");
  }

  if (run.assignedRunnerId !== runner.id) {
    throw new Error("Run is not assigned to this runner");
  }

  if (run.status !== "completed") {
    throw new Error("Run must be completed before payout preparation");
  }

  if (run.paymentStatus !== "captured") {
    throw new Error("Requester payment must be captured before payout preparation");
  }

  if (run.payoutStatus !== "ready_for_payout") {
    throw new Error("Run is not ready for payout");
  }

  if (!runner.stripeConnectedAccountId) {
    throw new Error("Runner payout account onboarding is required");
  }

  if (runner.payoutOnboardingStatus !== "ready") {
    throw new Error("Runner payout account is not ready");
  }

  return {
    amount: requirePositiveWholeDollarAmount(run.runnerPayout),
    connectedAccountId: runner.stripeConnectedAccountId,
  };
}

async function prepareRunnerPayout({
  prisma,
  run,
  runner,
  currency,
}) {
  requireDependency(prisma?.runnerPayout?.findUnique, "prisma.runnerPayout.findUnique");
  requireDependency(prisma?.runnerPayout?.create, "prisma.runnerPayout.create");

  const eligibility = assertRunnerPayoutEligibility({ run, runner });
  const normalizedCurrency = normalizeCurrency(currency);
  const idempotencyKey = payoutIdempotencyKey({
    runnerId: runner.id,
    runId: run.id,
  });

  const existing = await prisma.runnerPayout.findUnique({
    where: { runId: run.id },
  });

  if (existing) {
    if (
      existing.runnerId !== runner.id ||
      existing.amount !== eligibility.amount ||
      existing.currency !== normalizedCurrency
    ) {
      throw new Error("Existing payout ledger record does not match canonical run payout");
    }

    return {
      payout: existing,
      alreadyPrepared: true,
    };
  }

  const payout = await prisma.runnerPayout.create({
    data: {
      runnerId: runner.id,
      runId: run.id,
      amount: eligibility.amount,
      currency: normalizedCurrency,
      status: "prepared",
      idempotencyKey,
      providerTransferId: null,
    },
  });

  return {
    payout,
    alreadyPrepared: false,
  };
}

module.exports = {
  assertRunnerPayoutEligibility,
  payoutIdempotencyKey,
  prepareRunnerPayout,
};
