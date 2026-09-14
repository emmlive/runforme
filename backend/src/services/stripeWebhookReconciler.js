const SUPPORTED_PAYMENT_INTENT_EVENTS = new Set([
  "payment_intent.amount_capturable_updated",
  "payment_intent.succeeded",
  "payment_intent.canceled",
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

    case "payment_intent.succeeded":
      return {
        paymentStatus: "captured",
        payoutStatus: "ready_for_payout",
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

  const existingEvent =
    await prisma.stripeWebhookEvent.findUnique({
      where: {
        id: event.id,
      },
    });

  if (existingEvent) {
    return {
      deduped: true,
      applied: false,
      reason: "duplicate event already recorded",
    };
  }

  await prisma.stripeWebhookEvent.create({
    data: {
      id: event.id,
      type: event.type,
      runId: null,
      applied: false,
      rawEvent: event,
    },
  });

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

  const runState = paymentIntentStateForEvent(
    event.type
  );

  const updatedRun = await prisma.run.update({
    where: {
      id: run.id,
    },
    data: runState,
  });

  await prisma.stripeWebhookEvent.update({
    where: {
      id: event.id,
    },
    data: {
      runId: updatedRun.id,
      applied: true,
    },
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