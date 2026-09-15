const {
  createPaymentService,
} = require("./paymentService");

const {
  authorizeSecureHold,
} = require("./secureHoldService");

const {
  captureRunPayment,
} = require("./runPaymentSettlement");

const {
  reconcileStripeEvent,
} = require("./stripeWebhookReconciler");

function requireRun(run) {
  if (!run || typeof run !== "object") {
    throw new Error(
      "Synthetic payment E2E run is required"
    );
  }

  return run;
}

async function runSyntheticPaymentLifecycle({
  stripe,
  currency,
  run,
}) {
  const inputRun = requireRun(run);

  const workingRun = {
    ...inputRun,
    requesterId:
      inputRun.requesterId ||
      "requester-synthetic-e2e",
  };

  const prisma = {
    run: {
      async update({ where, data }) {
        if (
          !where ||
          where.id !== workingRun.id
        ) {
          throw new Error(
            "Synthetic Prisma update run identity mismatch"
          );
        }

        Object.assign(
          workingRun,
          data
        );

        return {
          ...workingRun,
        };
      },
    },
  };

  const paymentService =
    createPaymentService({
      stripe,
      currency,
    });

  const authorization =
    await authorizeSecureHold({
      run: workingRun,
      prisma,
      paymentService,
      releasePendingOffers:
        async () => {},
    });

  if (
    authorization.state !== "authorized" ||
    authorization.run.authorizationStatus !== "authorized" ||
    authorization.run.paymentStatus !== "authorized"
  ) {
    throw new Error(
      "Synthetic Secure Hold did not reach canonical authorized state"
    );
  }

  return captureRunPayment({
    run: authorization.run,
    prisma,
    paymentService,
  });
}

async function runSyntheticWebhookReconciliation({
  prisma,
  event,
}) {
  return reconcileStripeEvent({
    prisma,
    event,
  });
}

module.exports = {
  runSyntheticPaymentLifecycle,
  runSyntheticWebhookReconciliation,
};