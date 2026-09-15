const assert = require("node:assert/strict");
const test = require("node:test");

function loadWebhookHarness() {
  const {
    runSyntheticWebhookReconciliation,
  } = require("./paymentE2eHarness");

  if (
    typeof runSyntheticWebhookReconciliation !==
    "function"
  ) {
    assert.fail(
      "runSyntheticWebhookReconciliation implementation is required"
    );
  }

  return {
    runSyntheticWebhookReconciliation,
  };
}

function createSyntheticState() {
  const run = {
    id: "run-synthetic-webhook",
    paymentIntentId: "pi_synthetic_webhook",
    authorizationStatus: "authorized",
    paymentStatus: "captured",
    payoutStatus: "ready_for_payout",
  };

  const events = new Map();
  const runUpdates = [];

  const prisma = {
    stripeWebhookEvent: {
      async findUnique({ where }) {
        const event = events.get(where.id);
        return event ? { ...event } : null;
      },

      async create({ data }) {
        if (events.has(data.id)) {
          const error = new Error(
            "Synthetic unique constraint"
          );
          error.code = "P2002";
          throw error;
        }

        events.set(data.id, {
          ...data,
        });

        return {
          ...data,
        };
      },

      async update({ where, data }) {
        const existing = events.get(where.id);

        if (!existing) {
          throw new Error(
            "Synthetic webhook event not found"
          );
        }

        const updated = {
          ...existing,
          ...data,
        };

        events.set(
          where.id,
          updated
        );

        return {
          ...updated,
        };
      },
    },

    run: {
      async findFirst({ where }) {
        if (
          where.paymentIntentId !==
          run.paymentIntentId
        ) {
          return null;
        }

        return {
          ...run,
        };
      },

      async update({ where, data }) {
        if (where.id !== run.id) {
          throw new Error(
            "Synthetic run identity mismatch"
          );
        }

        runUpdates.push({
          ...data,
        });

        Object.assign(
          run,
          data
        );

        return {
          ...run,
        };
      },
    },
  };

  return {
    run,
    events,
    runUpdates,
    prisma,
  };
}

test("synthetic succeeded webhook records reconciliation without changing captured settlement state", async () => {
  const {
    runSyntheticWebhookReconciliation,
  } = loadWebhookHarness();

  const state = createSyntheticState();

  const result =
    await runSyntheticWebhookReconciliation({
      prisma: state.prisma,
      event: {
        id: "evt_synthetic_succeeded",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_synthetic_webhook",
          },
        },
      },
    });

  assert.equal(result.applied, true);
  assert.equal(result.deduped, false);

  assert.equal(
    state.run.paymentStatus,
    "captured"
  );

  assert.equal(
    state.run.payoutStatus,
    "ready_for_payout"
  );

  assert.equal(
    state.runUpdates.length,
    0
  );

  assert.equal(
    state.events.get(
      "evt_synthetic_succeeded"
    ).applied,
    true
  );
});

test("synthetic duplicate webhook is idempotent", async () => {
  const {
    runSyntheticWebhookReconciliation,
  } = loadWebhookHarness();

  const state = createSyntheticState();

  const event = {
    id: "evt_synthetic_duplicate",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_synthetic_webhook",
      },
    },
  };

  const first =
    await runSyntheticWebhookReconciliation({
      prisma: state.prisma,
      event,
    });

  const second =
    await runSyntheticWebhookReconciliation({
      prisma: state.prisma,
      event,
    });

  assert.equal(first.applied, true);
  assert.equal(first.deduped, false);

  assert.equal(second.applied, false);
  assert.equal(second.deduped, true);

  assert.equal(
    state.runUpdates.length,
    0
  );
});

test("late authorization webhook cannot regress captured synthetic run", async () => {
  const {
    runSyntheticWebhookReconciliation,
  } = loadWebhookHarness();

  const state = createSyntheticState();

  const result =
    await runSyntheticWebhookReconciliation({
      prisma: state.prisma,
      event: {
        id: "evt_synthetic_late_auth",
        type:
          "payment_intent.amount_capturable_updated",
        data: {
          object: {
            id: "pi_synthetic_webhook",
          },
        },
      },
    });

  assert.equal(result.applied, true);
  assert.equal(result.deduped, false);

  assert.equal(
    state.run.paymentStatus,
    "captured"
  );

  assert.equal(
    state.run.payoutStatus,
    "ready_for_payout"
  );

  assert.equal(
    state.runUpdates.length,
    0
  );
});