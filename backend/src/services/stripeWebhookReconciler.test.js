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

test("succeeded PaymentIntent webhook preserves canonical settlement authority", async () => {
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
    "authorized",
    "webhook must not independently mark canonical payment capture complete"
  );

  assert.equal(
    harness.getStoredRun().payoutStatus,
    "awaiting_completion",
    "webhook must not independently make payout ready"
  );

  assert.equal(
    harness.calls.runUpdate.length,
    0,
    "canonical settlement remains the financial Run mutation authority"
  );

  assert.equal(
    harness.getStoredEvent().runId,
    41,
    "webhook event should still link to the canonical Run"
  );

  assert.equal(
    harness.getStoredEvent().applied,
    true,
    "valid succeeded webhook should still be recorded as reconciled"
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

test("existing unapplied webhook event is retried instead of discarded", async () => {
  const event = makeEvent({
    id: "evt_unapplied_retry",
    type: "payment_intent.amount_capturable_updated",
    paymentIntentId: "pi_unapplied_retry",
  });

  const harness = createFakePrisma({
    existingEvent: {
      id: event.id,
      type: event.type,
      runId: null,
      applied: false,
      rawEvent: event,
    },
    run: {
      id: 81,
      paymentIntentId: "pi_unapplied_retry",
      authorizationStatus: "authorizing",
      paymentStatus: "pending_payment_method",
      payoutStatus: "not_started",
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(
    result.applied,
    true,
    "an existing unapplied event must be retried"
  );

  assert.equal(
    harness.calls.stripeWebhookEventCreate.length,
    0,
    "retry must reuse the existing webhook event row"
  );

  assert.equal(
    harness.calls.runUpdate.length,
    1,
    "retry must reach Run reconciliation"
  );

  assert.equal(
    harness.getStoredRun().authorizationStatus,
    "authorized"
  );

  assert.equal(
    harness.getStoredEvent().applied,
    true
  );
});

test("P2002 webhook insert race is recovered as duplicate delivery", async () => {
  const event = makeEvent({
    id: "evt_p2002_race",
    type: "payment_intent.succeeded",
    paymentIntentId: "pi_p2002_race",
  });

  let findCount = 0;
  let runUpdateCount = 0;

  const prisma = {
    stripeWebhookEvent: {
      async findUnique() {
        findCount += 1;

        if (findCount === 1) {
          return null;
        }

        return {
          id: event.id,
          type: event.type,
          runId: 82,
          applied: true,
          rawEvent: event,
        };
      },

      async create() {
        const error = new Error(
          "Unique constraint failed on StripeWebhookEvent.id"
        );

        error.code = "P2002";
        throw error;
      },

      async update() {
        throw new Error(
          "event update must not occur for already-applied P2002 duplicate"
        );
      },
    },

    run: {
      async findFirst() {
        throw new Error(
          "Run lookup must not occur for already-applied P2002 duplicate"
        );
      },

      async update() {
        runUpdateCount += 1;

        throw new Error(
          "Run update must not occur for already-applied P2002 duplicate"
        );
      },
    },
  };

  const result = await reconcileStripeEvent({
    event,
    prisma,
  });

  assert.equal(result.deduped, true);
  assert.equal(result.applied, false);

  assert.equal(
    findCount,
    2,
    "P2002 recovery must re-read the event inserted by the competing request"
  );

  assert.equal(runUpdateCount, 0);
});

test("late webhook events cannot regress an already captured Run", async () => {
  for (const [index, type] of [
    [1, "payment_intent.amount_capturable_updated"],
    [2, "payment_intent.canceled"],
  ]) {
    const event = makeEvent({
      id: `evt_late_after_capture_${index}`,
      type,
      paymentIntentId: "pi_already_captured",
    });

    const harness = createFakePrisma({
      run: {
        id: 83,
        paymentIntentId: "pi_already_captured",
        authorizationStatus: "authorized",
        paymentStatus: "captured",
        payoutStatus: "ready_for_payout",
      },
    });

    await reconcileStripeEvent({
      event,
      prisma: harness.prisma,
    });

    assert.equal(
      harness.getStoredRun().paymentStatus,
      "captured",
      `${type} must not regress captured payment state`
    );

    assert.equal(
      harness.getStoredRun().payoutStatus,
      "ready_for_payout",
      `${type} must not revoke canonical payout readiness`
    );

    assert.equal(
      harness.calls.runUpdate.length,
      0,
      `${type} must not mutate an already captured Run`
    );
  }
});

test("P2002 loser does not concurrently process an unapplied winning event", async () => {
  const event = makeEvent({
    id: "evt_p2002_unapplied_winner",
    type: "payment_intent.amount_capturable_updated",
    paymentIntentId: "pi_p2002_unapplied_winner",
  });

  let findCount = 0;
  let runLookupCount = 0;
  let runUpdateCount = 0;

  const prisma = {
    stripeWebhookEvent: {
      async findUnique() {
        findCount += 1;

        if (findCount === 1) {
          return null;
        }

        return {
          id: event.id,
          type: event.type,
          runId: null,
          applied: false,
          rawEvent: event,
        };
      },

      async create() {
        const error = new Error(
          "Unique constraint failed on StripeWebhookEvent.id"
        );

        error.code = "P2002";
        throw error;
      },

      async update() {
        throw new Error(
          "losing P2002 delivery must not update the winning event row"
        );
      },
    },

    run: {
      async findFirst() {
        runLookupCount += 1;

        throw new Error(
          "losing P2002 delivery must not reconcile the Run concurrently"
        );
      },

      async update() {
        runUpdateCount += 1;

        throw new Error(
          "losing P2002 delivery must not mutate the Run concurrently"
        );
      },
    },
  };

  const result = await reconcileStripeEvent({
    event,
    prisma,
  });

  assert.equal(
    result.deduped,
    true,
    "P2002 loser should defer to the delivery that created the event row"
  );

  assert.equal(result.applied, false);

  assert.equal(
    findCount,
    2,
    "P2002 recovery should re-read the competing event row once"
  );

  assert.equal(runLookupCount, 0);
  assert.equal(runUpdateCount, 0);
});

test("late authorization webhook cannot resurrect a canceled Run", async () => {
  const event = makeEvent({
    id: "evt_late_authorization_after_cancel",
    type: "payment_intent.amount_capturable_updated",
    paymentIntentId: "pi_already_canceled",
  });

  const harness = createFakePrisma({
    run: {
      id: 85,
      paymentIntentId: "pi_already_canceled",
      authorizationStatus: "canceled",
      paymentStatus: "canceled",
      payoutStatus: "not_ready",
    },
  });

  const result = await reconcileStripeEvent({
    event,
    prisma: harness.prisma,
  });

  assert.equal(result.applied, true);

  assert.equal(
    harness.getStoredRun().authorizationStatus,
    "canceled",
    "late authorization event must not resurrect canceled authorization"
  );

  assert.equal(
    harness.getStoredRun().paymentStatus,
    "canceled",
    "late authorization event must not resurrect canceled payment"
  );

  assert.equal(
    harness.getStoredRun().payoutStatus,
    "not_ready"
  );

  assert.equal(
    harness.calls.runUpdate.length,
    0,
    "canceled Run is terminal for webhook financial-state mutation"
  );

  assert.equal(
    harness.getStoredEvent().applied,
    true,
    "late event should still be recorded as reconciled"
  );
});
