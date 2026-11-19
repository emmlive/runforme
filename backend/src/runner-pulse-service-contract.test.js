const assert = require("node:assert/strict");
const test = require("node:test");

const {
  VALID_PULSE_REASONS,
  createRunnerPulseService,
} = require("./services/runnerPulseService");

function createMemoryPrisma() {
  const states = new Map();
  const events = [];
  let nextEventId = 1;

  const api = {
    _states: states,
    _events: events,

    runnerPulseState: {
      async findUnique({ where }) {
        return states.get(where.runnerId) || null;
      },

      async upsert({ where, create, update }) {
        const current = states.get(where.runnerId);

        if (!current) {
          const value = {
            id: states.size + 1,
            lastMissedRunId: null,
            lastPromptedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...create,
          };
          states.set(where.runnerId, value);
          return { ...value };
        }

        const next = { ...current };

        for (const [key, value] of Object.entries(update)) {
          if (value && typeof value === "object" && "increment" in value) {
            next[key] = Number(next[key] || 0) + Number(value.increment);
          } else {
            next[key] = value;
          }
        }

        next.updatedAt = new Date();
        states.set(where.runnerId, next);
        return { ...next };
      },

      async update({ where, data }) {
        const current = states.get(where.runnerId);
        if (!current) throw new Error("state missing");
        const next = { ...current, ...data, updatedAt: new Date() };
        states.set(where.runnerId, next);
        return { ...next };
      },
    },

    runnerPulseEvent: {
      async findUnique({ where }) {
        const key = where.runnerId_trigger_runId;
        if (!key) return null;

        return (
          events.find(
            (event) =>
              event.runnerId === key.runnerId &&
              event.trigger === key.trigger &&
              event.runId === key.runId
          ) || null
        );
      },

      async create({ data }) {
        const event = {
          id: nextEventId++,
          createdAt: new Date(),
          ...data,
        };
        events.push(event);
        return { ...event };
      },
    },

    async $transaction(callback) {
      return callback(api);
    },
  };

  return api;
}

test("three unique non-accepted offers become Pulse eligible", async () => {
  const prisma = createMemoryPrisma();
  const clock = { now: new Date("2026-11-19T12:00:00Z") };
  const pulse = createRunnerPulseService({
    prisma,
    now: () => new Date(clock.now),
  });

  assert.equal((await pulse.recordNonAcceptedOffer({ runnerId: 12, runId: 101 })).missCount, 1);
  assert.equal((await pulse.recordNonAcceptedOffer({ runnerId: 12, runId: 102 })).missCount, 2);

  const beforeThird = await pulse.getPulseEligibility({
    runnerId: 12,
    hasActiveRun: false,
  });
  assert.equal(beforeThird.eligible, false);

  assert.equal((await pulse.recordNonAcceptedOffer({ runnerId: 12, runId: 103 })).missCount, 3);

  const eligible = await pulse.getPulseEligibility({
    runnerId: 12,
    hasActiveRun: false,
  });

  assert.deepEqual(
    {
      eligible: eligible.eligible,
      trigger: eligible.trigger,
      missCount: eligible.missCount,
    },
    {
      eligible: true,
      trigger: "three_non_accepted_offers",
      missCount: 3,
    }
  );
});

test("duplicate processing of the same runner/run does not double-count", async () => {
  const prisma = createMemoryPrisma();
  const pulse = createRunnerPulseService({ prisma });

  await pulse.recordNonAcceptedOffer({ runnerId: 12, runId: 201 });
  await pulse.recordNonAcceptedOffer({ runnerId: 12, runId: 202 });
  await pulse.recordNonAcceptedOffer({ runnerId: 12, runId: 201 });

  assert.equal(prisma._states.get(12).consecutiveMisses, 2);
  assert.equal(
    prisma._events.filter((event) => event.trigger === "offer_not_accepted").length,
    2
  );
});

test("accepting a run resets consecutive misses", async () => {
  const prisma = createMemoryPrisma();
  const pulse = createRunnerPulseService({ prisma });

  await pulse.recordNonAcceptedOffer({ runnerId: 12, runId: 301 });
  await pulse.recordNonAcceptedOffer({ runnerId: 12, runId: 302 });
  await pulse.resetPulseMisses({ runnerId: 12 });

  assert.equal(prisma._states.get(12).consecutiveMisses, 0);
  assert.equal(prisma._states.get(12).lastMissedRunId, null);
});

test("active run suppresses Pulse without consuming cooldown", async () => {
  const prisma = createMemoryPrisma();
  const clock = { now: new Date("2026-11-19T12:00:00Z") };
  const pulse = createRunnerPulseService({
    prisma,
    now: () => new Date(clock.now),
  });

  for (const runId of [401, 402, 403]) {
    await pulse.recordNonAcceptedOffer({ runnerId: 12, runId });
  }

  const suppressed = await pulse.getPulseEligibility({
    runnerId: 12,
    hasActiveRun: true,
  });

  assert.equal(suppressed.eligible, false);
  assert.equal(prisma._states.get(12).lastPromptedAt, null);

  const eligible = await pulse.getPulseEligibility({
    runnerId: 12,
    hasActiveRun: false,
  });

  assert.equal(eligible.eligible, true);
  assert.ok(prisma._states.get(12).lastPromptedAt instanceof Date);
});

test("24-hour cooldown survives repeated eligibility checks", async () => {
  const prisma = createMemoryPrisma();
  const clock = { now: new Date("2026-11-19T12:00:00Z") };
  const pulse = createRunnerPulseService({
    prisma,
    now: () => new Date(clock.now),
  });

  for (const runId of [501, 502, 503]) {
    await pulse.recordNonAcceptedOffer({ runnerId: 12, runId });
  }

  assert.equal(
    (await pulse.getPulseEligibility({ runnerId: 12, hasActiveRun: false })).eligible,
    true
  );

  assert.equal(
    (await pulse.getPulseEligibility({ runnerId: 12, hasActiveRun: false })).eligible,
    false
  );

  clock.now = new Date("2026-11-20T12:00:01Z");

  assert.equal(
    (await pulse.getPulseEligibility({ runnerId: 12, hasActiveRun: false })).eligible,
    true
  );
});

test("valid categorical feedback and dismissal are recorded", async () => {
  const prisma = createMemoryPrisma();
  const pulse = createRunnerPulseService({ prisma });

  await pulse.recordNonAcceptedOffer({ runnerId: 12, runId: 601 });

  const response = await pulse.recordPulseResponse({
    runnerId: 12,
    reason: "closer_to_me",
    dismissed: false,
  });

  assert.equal(response.reason, "closer_to_me");
  assert.equal(response.dismissed, false);
  assert.ok(response.respondedAt instanceof Date);

  const dismissal = await pulse.recordPulseResponse({
    runnerId: 12,
    dismissed: true,
  });

  assert.equal(dismissal.reason, null);
  assert.equal(dismissal.dismissed, true);
  assert.equal(dismissal.respondedAt, null);
});

test("unknown feedback reason fails closed", async () => {
  const prisma = createMemoryPrisma();
  const pulse = createRunnerPulseService({ prisma });

  await assert.rejects(
    pulse.recordPulseResponse({
      runnerId: 12,
      reason: "lower_my_ranking",
      dismissed: false,
    }),
    /Invalid Pulse reason/
  );

  assert.deepEqual(
    [...VALID_PULSE_REASONS].sort(),
    [
      "better_timing",
      "better_value",
      "closer_to_me",
      "different_errand",
      "done_for_now",
      "something_else",
    ]
  );
});


test("responding or dismissing resets the pass streak so old behavior cannot retrigger", async () => {
  const prisma = createMemoryPrisma();
  const pulse = createRunnerPulseService({ prisma });

  for (const runId of [701, 702, 703]) {
    await pulse.recordNonAcceptedOffer({ runnerId: 12, runId });
  }

  assert.equal(prisma._states.get(12).consecutiveMisses, 3);

  await pulse.recordPulseResponse({
    runnerId: 12,
    reason: "better_timing",
    dismissed: false,
  });

  assert.equal(prisma._states.get(12).consecutiveMisses, 0);
  assert.equal(prisma._states.get(12).lastMissedRunId, null);

  for (const runId of [704, 705, 706]) {
    await pulse.recordNonAcceptedOffer({ runnerId: 12, runId });
  }

  await pulse.recordPulseResponse({
    runnerId: 12,
    dismissed: true,
  });

  assert.equal(prisma._states.get(12).consecutiveMisses, 0);
  assert.equal(prisma._states.get(12).lastMissedRunId, null);
});
