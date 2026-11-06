const createStripeClient = require("stripe");
const {
  assertPaymentRuntimeAuthorized,
} = require("./paymentRuntimeGuard");
const {
  prepareRunnerPayout,
} = require("./runnerPayoutFoundation");

function requireDependency(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function toMinorUnits(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Runner payout must be a positive whole-dollar integer");
  }

  return amount * 100;
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

async function executeRunnerCashOut({
  prisma,
  run,
  runner,
  currency,
  stripe = getStripeClient(),
}) {
  requireDependency(prisma?.runnerPayout?.findUnique, "prisma.runnerPayout.findUnique");
  requireDependency(prisma?.runnerPayout?.update, "prisma.runnerPayout.update");
  requireDependency(prisma?.run?.update, "prisma.run.update");
  requireDependency(stripe?.paymentIntents?.retrieve, "stripe.paymentIntents.retrieve");
  requireDependency(stripe?.transfers?.create, "stripe.transfers.create");

  const existing = await prisma.runnerPayout.findUnique({
    where: { runId: run.id },
  });

  if (
    existing?.status === "transferred" &&
    existing.providerTransferId
  ) {
    if (
      existing.runnerId !== runner.id ||
      existing.amount !== run.runnerPayout ||
      existing.currency !== String(currency || "").trim().toLowerCase()
    ) {
      throw new Error("Existing transferred payout does not match canonical run payout");
    }

    if (run.assignedRunnerId !== runner.id || run.status !== "completed") {
      throw new Error("Transferred payout does not belong to this completed runner run");
    }

    if (run.payoutStatus !== "transferred") {
      await prisma.run.update({
        where: { id: run.id },
        data: { payoutStatus: "transferred" },
      });
    }

    return {
      payout: existing,
      alreadyTransferred: true,
    };
  }

  const prepared = await prepareRunnerPayout({
    prisma,
    run,
    runner,
    currency,
  });

  let payout = prepared.payout;

  if (!run.paymentIntentId) {
    throw new Error("Captured PaymentIntent is required for runner payout");
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(
    run.paymentIntentId
  );

  if (paymentIntent?.status !== "succeeded") {
    throw new Error("Captured PaymentIntent is not in succeeded status");
  }

  const sourceChargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id;

  if (!sourceChargeId) {
    throw new Error("Captured PaymentIntent does not have a source charge");
  }

  const transfer = await stripe.transfers.create(
    {
      amount: toMinorUnits(payout.amount),
      currency: payout.currency,
      destination: runner.stripeConnectedAccountId,
      source_transaction: sourceChargeId,
      metadata: {
        runId: String(run.id),
        runnerId: String(runner.id),
        runnerPayoutId: String(payout.id),
      },
    },
    {
      idempotencyKey: `${payout.idempotencyKey}:transfer`,
    }
  );

  if (!transfer?.id) {
    throw new Error("Stripe transfer did not return a transfer id");
  }

  payout = await prisma.runnerPayout.update({
    where: { id: payout.id },
    data: {
      status: "transferred",
      providerTransferId: transfer.id,
      failureCode: null,
    },
  });

  await prisma.run.update({
    where: { id: run.id },
    data: { payoutStatus: "transferred" },
  });

  return {
    payout,
    alreadyTransferred: false,
  };
}

module.exports = {
  executeRunnerCashOut,
};
