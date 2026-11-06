const SUPPORTED_PAYMENT_INTENT_EVENTS = new Set([
  "payment_intent.amount_capturable_updated",
  "payment_intent.succeeded",
  "payment_intent.canceled",
]);

const SUPPORTED_TRANSFER_EVENTS = new Set([
  "transfer.created",
  "transfer.updated",
  "transfer.reversed",
]);

function requireDependency(value, name) {
  if (typeof value !== "function") {
    throw new Error(`${name} is required`);
  }
}

function requireEvent(event) {
  if (!event || typeof event !== "object") {
    throw new Error("Stripe event is required");
  }

  if (!event.id) {
    throw new Error("Stripe event id is required");
  }

  if (!event.type) {
    throw new Error("Stripe event type is required");
  }
}

function paymentIntentStateForEvent(type) {
  switch (type) {
    case "payment_intent.amount_capturable_updated":
      return {
        authorizationStatus: "authorized",
        paymentStatus: "authorized",
      };

    case "payment_intent.canceled":
      return {
        authorizationStatus: "canceled",
        paymentStatus: "canceled",
        payoutStatus: "not_ready",
      };

    default:
      return null;
  }
}

function duplicateResult() {
  return {
    deduped: true,
    applied: false,
    reason: "duplicate event already recorded",
  };
}

async function markEventApplied({
  prisma,
  eventId,
  runId,
}) {
  await prisma.stripeWebhookEvent.update({
    where: {
      id: eventId,
    },
    data: {
      runId,
      applied: true,
    },
  });
}


function transferStateForEvent({ event, payout }) {
  const transfer = event?.data?.object || {};

  if (event.type === "transfer.reversed") {
    const amountReversed = Number(transfer.amount_reversed || 0);
    const payoutMinorUnits = Number(payout.amount || 0) * 100;
    const fullyReversed =
      transfer.reversed === true ||
      (payoutMinorUnits > 0 && amountReversed >= payoutMinorUnits);

    return fullyReversed
      ? {
          payoutStatus: "reversed",
          failureCode: "stripe_transfer_reversed",
        }
      : {
          payoutStatus: "partially_reversed",
          failureCode: "stripe_transfer_partially_reversed",
        };
  }

  return {
    payoutStatus: "transferred",
    failureCode: null,
  };
}

async function reconcileTransferEvent({
  event,
  prisma,
}) {
  requireDependency(
    prisma?.runnerPayout?.findUnique,
    "prisma.runnerPayout.findUnique"
  );

  requireDependency(
    prisma?.runnerPayout?.update,
    "prisma.runnerPayout.update"
  );

  const transferId = event?.data?.object?.id;

  if (!transferId) {
    return {
      deduped: false,
      applied: false,
      reason: "Transfer mapping not found",
    };
  }

  const payout = await prisma.runnerPayout.findUnique({
    where: {
      providerTransferId: transferId,
    },
  });

  if (!payout) {
    return {
      deduped: false,
      applied: false,
      reason: "Runner payout mapping not found for Transfer",
    };
  }

  const state = transferStateForEvent({
    event,
    payout,
  });

  const updatedPayout = await prisma.runnerPayout.update({
    where: {
      id: payout.id,
    },
    data: {
      status: state.payoutStatus,
      failureCode: state.failureCode,
    },
  });

  if (
    event.type === "transfer.reversed" ||
    payout.status !== "reversed"
  ) {
    await prisma.run.update({
      where: {
        id: payout.runId,
      },
      data: {
        payoutStatus: state.payoutStatus,
      },
    });
  }

  await markEventApplied({
    prisma,
    eventId: event.id,
    runId: payout.runId,
  });

  return {
    deduped: false,
    applied: true,
    reason: "Stripe Transfer event reconciled",
    payout: updatedPayout,
  };
}

async function reconcileStripeEvent({
  event,
  prisma,
}) {
  requireEvent(event);

  requireDependency(
    prisma?.stripeWebhookEvent?.findUnique,
    "prisma.stripeWebhookEvent.findUnique"
  );

  requireDependency(
    prisma?.stripeWebhookEvent?.create,
    "prisma.stripeWebhookEvent.create"
  );

  requireDependency(
    prisma?.stripeWebhookEvent?.update,
    "prisma.stripeWebhookEvent.update"
  );

  requireDependency(
    prisma?.run?.findFirst,
    "prisma.run.findFirst"
  );

  requireDependency(
    prisma?.run?.update,
    "prisma.run.update"
  );

  let existingEvent =
    await prisma.stripeWebhookEvent.findUnique({
      where: {
        id: event.id,
      },
    });

  if (existingEvent?.applied) {
    return duplicateResult();
  }

  if (!existingEvent) {
    try {
      await prisma.stripeWebhookEvent.create({
        data: {
          id: event.id,
          type: event.type,
          runId: null,
          applied: false,
          rawEvent: event,
        },
      });
    } catch (error) {
      if (error?.code !== "P2002") {
        throw error;
      }

      existingEvent =
        await prisma.stripeWebhookEvent.findUnique({
          where: {
            id: event.id,
          },
        });

      if (!existingEvent) {
        throw error;
      }

      return duplicateResult();
    }
  }

  if (SUPPORTED_TRANSFER_EVENTS.has(event.type)) {
    return reconcileTransferEvent({
      event,
      prisma,
    });
  }

  if (!SUPPORTED_PAYMENT_INTENT_EVENTS.has(event.type)) {
    return {
      deduped: false,
      applied: false,
      reason: "unsupported Stripe event",
    };
  }

  const paymentIntentId = event?.data?.object?.id;

  if (!paymentIntentId) {
    return {
      deduped: false,
      applied: false,
      reason: "PaymentIntent mapping not found",
    };
  }

  const run = await prisma.run.findFirst({
    where: {
      paymentIntentId,
    },
  });

  if (!run) {
    return {
      deduped: false,
      applied: false,
      reason: "Run mapping not found for PaymentIntent",
    };
  }

  if (event.type === "payment_intent.succeeded") {
    await markEventApplied({
      prisma,
      eventId: event.id,
      runId: run.id,
    });

    return {
      deduped: false,
      applied: true,
      reason: "Stripe event reconciled without claiming settlement authority",
    };
  }

  if (
    run.paymentStatus === "captured" ||
    run.paymentStatus === "canceled"
  ) {
    await markEventApplied({
      prisma,
      eventId: event.id,
      runId: run.id,
    });

    return {
      deduped: false,
      applied: true,
      reason: "Stripe event recorded without regressing terminal Run state",
    };
  }

  const runState = paymentIntentStateForEvent(
    event.type
  );

  const updatedRun = await prisma.run.update({
    where: {
      id: run.id,
    },
    data: runState,
  });

  await markEventApplied({
    prisma,
    eventId: event.id,
    runId: updatedRun.id,
  });

  return {
    deduped: false,
    applied: true,
    reason: "Stripe event reconciled",
  };
}

module.exports = {
  reconcileStripeEvent,
};