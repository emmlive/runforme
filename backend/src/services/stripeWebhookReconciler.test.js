const test = require("node:test");
const assert = require("node:assert/strict");

const {
  reconcileStripeEvent,
} = require("./stripeWebhookReconciler");

function makeEvent({
  id = "evt_test_1",
  type,
  paymentIntentId = "pi_test_1",
}) {
  return {
    id,
    type,
    data: {
      object: {
        id: paymentIntentId,
      },
    },
  };
}

function createFakePrisma({
  existingEvent = null,
  run = null,
} = {}) {
  const calls = {
    stripeWebhookEventFindUnique: [],
    stripeWebhookEventCreate: [],
    stripeWebhookEventUpdate: [],
    runFindFirst: [],
    runUpdate: [],
  };

  let storedEvent = existingEvent;
  let storedRun = run;

  const prisma = {
    stripeWebhookEvent: {
      async findUnique(args) {
        calls.stripeWebhookEventFindUnique.push(args);

        if (
          storedEvent &&
          args?.where?.id === storedEvent.id
        ) {
          return { ...storedEvent };
        }

        return null;
      },

      async create(args) {
        calls.stripeWebhookEventCreate.push(args);

        storedEvent = {
          ...args.data,
        };

        return { ...storedEvent };
      },

      async update(args) {
        calls.stripeWebhookEventUpdate.push(args);

        storedEvent = {
          ...storedEvent,
          ...args.data,
        };

        return { ...storedEvent };
      },
    },

    run: {
      async findFirst(args) {
        calls.runFindFirst.push(args);

        if (
          storedRun &&
          args?.where?.paymentIntentId === storedRun.paymentIntentId
        ) {
          return { ...storedRun };
        }

        return null;
      },

      async update(args) {
        calls.runUpdate.push(args);

        if (!storedRun) {
          throw new Error("fake run missing");
        }

        storedRun = {
          ...storedRun,
          ...args.data,
        };

        return { ...storedRun };
      },
    },
  };

  return {
    prisma,
    calls,
    getStoredEvent() {
      return storedEvent;
    },
    getStoredRun() {
      return storedRun;
    },
  };
}

test("duplicate webhook event ID is idempotent", async () => {
  const event = makeEvent({
    id: "evt_duplicate",
    type: "payment_intent.succeeded",
  });

  const harness = createFakePrisma({
    existingEvent: {
      id: event.id,
      type: event.type,
      runId: 17,
      applied: true,
      rawEvent: event,
    },
    run: {
      id: 17,
      paymentIntentId: "pi_test_1",
      authorizationStatus: "authorized",
      paymentStatus: "captured",
      payoutStatus: "ready_for_payout",
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.deduped, true);
  assert.equal(result.applied, false);
  assert.match(result.reason, /duplicate|already/i);

  assert.equal(
    harness.calls.runUpdate.length,
    0
  );

  assert.equal(
    harness.calls.stripeWebhookEventCreate.length,
    0
  );
});

test("supported PaymentIntent event links by canonical paymentIntentId", async () => {
  const event = makeEvent({
    id: "evt_link",
    type: "payment_intent.amount_capturable_updated",
    paymentIntentId: "pi_link",
  });

  const harness = createFakePrisma({
    run: {
      id: 21,
      paymentIntentId: "pi_link",
      authorizationStatus: "authorizing",
      paymentStatus: "pending_payment_method",
      payoutStatus: "not_started",
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.deduped, false);
  assert.equal(result.applied, true);

  assert.deepEqual(
    harness.calls.runFindFirst[0],
    {
      where: {
        paymentIntentId: "pi_link",
      },
    }
  );

  assert.equal(
    harness.getStoredEvent().runId,
    21
  );
});

test("PaymentIntent authorization event reconciles canonical authorized state", async () => {
  const event = makeEvent({
    id: "evt_authorized",
    type: "payment_intent.amount_capturable_updated",
    paymentIntentId: "pi_authorized",
  });

  const harness = createFakePrisma({
    run: {
      id: 31,
      paymentIntentId: "pi_authorized",
      authorizationStatus: "authorizing",
      paymentStatus: "pending_payment_method",
      payoutStatus: "not_started",
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.applied, true);

  assert.equal(
    harness.getStoredRun().authorizationStatus,
    "authorized"
  );

  assert.equal(
    harness.getStoredRun().paymentStatus,
    "authorized"
  );

  assert.notEqual(
    harness.getStoredRun().payoutStatus,
    "ready_for_payout"
  );
});

test("captured PaymentIntent event reconciles captured payment and payout readiness", async () => {
  const event = makeEvent({
    id: "evt_captured",
    type: "payment_intent.succeeded",
    paymentIntentId: "pi_captured",
  });

  const harness = createFakePrisma({
    run: {
      id: 41,
      paymentIntentId: "pi_captured",
      authorizationStatus: "authorized",
      paymentStatus: "authorized",
      payoutStatus: "awaiting_completion",
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.applied, true);

  assert.equal(
    harness.getStoredRun().paymentStatus,
    "captured"
  );

  assert.equal(
    harness.getStoredRun().payoutStatus,
    "ready_for_payout"
  );
});

test("canceled PaymentIntent event reconciles canceled authorization state", async () => {
  const event = makeEvent({
    id: "evt_canceled",
    type: "payment_intent.canceled",
    paymentIntentId: "pi_canceled",
  });

  const harness = createFakePrisma({
    run: {
      id: 51,
      paymentIntentId: "pi_canceled",
      authorizationStatus: "authorized",
      paymentStatus: "authorized",
      payoutStatus: "not_started",
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.applied, true);

  assert.equal(
    harness.getStoredRun().authorizationStatus,
    "canceled"
  );

  assert.equal(
    harness.getStoredRun().paymentStatus,
    "canceled"
  );

  assert.equal(
    harness.getStoredRun().payoutStatus,
    "not_ready"
  );
});

test("unsupported valid event is acknowledged without Run mutation", async () => {
  const event = makeEvent({
    id: "evt_unsupported",
    type: "customer.updated",
    paymentIntentId: "cus_not_a_payment_intent",
  });

  const harness = createFakePrisma({
    run: {
      id: 61,
      paymentIntentId: "pi_unrelated",
      authorizationStatus: "authorized",
      paymentStatus: "authorized",
      payoutStatus: "not_started",
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.deduped, false);
  assert.equal(result.applied, false);
  assert.match(result.reason, /unsupported/i);

  assert.equal(
    harness.calls.runFindFirst.length,
    0
  );

  assert.equal(
    harness.calls.runUpdate.length,
    0
  );
});

test("unmapped PaymentIntent event does not mutate unrelated runs", async () => {
  const event = makeEvent({
    id: "evt_unmapped",
    type: "payment_intent.succeeded",
    paymentIntentId: "pi_missing",
  });

  const harness = createFakePrisma({
    run: {
      id: 71,
      paymentIntentId: "pi_other",
      authorizationStatus: "authorized",
      paymentStatus: "authorized",
      payoutStatus: "not_started",
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.deduped, false);
  assert.equal(result.applied, false);
  assert.match(
    result.reason,
    /run|mapping|not found/i
  );

  assert.equal(
    harness.calls.runUpdate.length,
    0
  );

  assert.equal(
    harness.getStoredRun().paymentStatus,
    "authorized"
  );
});