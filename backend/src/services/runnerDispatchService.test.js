const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ensurePendingOffersForRunner,
} = require("./runnerDispatchService");

function createHarness({ runs = [], existingOffers = [] } = {}) {
  const calls = {
    runFindMany: [],
    offerFindFirst: [],
    offerCreate: [],
  };

  const offers = [...existingOffers];

  const prisma = {
    run: {
      async findMany(args) {
        calls.runFindMany.push(args);
        return runs;
      },
    },
    offer: {
      async findFirst(args) {
        calls.offerFindFirst.push(args);
        return (
          offers.find(
            (offer) =>
              offer.runId === args.where.runId &&
              offer.runnerId === args.where.runnerId
          ) || null
        );
      },
      async create(args) {
        calls.offerCreate.push(args);
        const offer = {
          id: 100 + offers.length,
          createdAt: new Date("2026-11-05T20:00:00.000Z"),
          ...args.data,
        };
        offers.push(offer);
        return offer;
      },
    },
  };

  return { prisma, calls, offers };
}

test("backfills missing pending offers only for dispatchable runs", async () => {
  const run = {
    id: 3,
    status: "open",
    assignedRunnerId: null,
    handoffEligibility: "eligible",
    authorizationStatus: "authorized",
    holdAmount: 8,
    createdAt: new Date("2026-11-05T19:33:34.000Z"),
  };

  const harness = createHarness({ runs: [run] });

  const result = await ensurePendingOffersForRunner({
    prisma: harness.prisma,
    runnerId: 12,
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].run.id, 3);
  assert.equal(result[0].offer.runnerId, 12);
  assert.equal(result[0].offer.status, "pending");

  assert.deepEqual(harness.calls.runFindMany[0].where, {
    status: "open",
    assignedRunnerId: null,
    handoffEligibility: "eligible",
    OR: [
      { holdAmount: 0 },
      { authorizationStatus: "authorized" },
    ],
    offers: {
      none: {
        runnerId: 12,
      },
    },
  });
});

test("does not duplicate an existing runner offer", async () => {
  const run = {
    id: 3,
    status: "open",
    assignedRunnerId: null,
    handoffEligibility: "eligible",
    authorizationStatus: "authorized",
    holdAmount: 8,
  };

  const harness = createHarness({
    runs: [run],
    existingOffers: [
      {
        id: 7,
        runId: 3,
        runnerId: 12,
        status: "pending",
        createdAt: new Date("2026-11-05T19:55:00.000Z"),
      },
    ],
  });

  const result = await ensurePendingOffersForRunner({
    prisma: harness.prisma,
    runnerId: 12,
  });

  assert.deepEqual(result, []);
  assert.equal(harness.calls.offerCreate.length, 0);
});

test("rejects invalid runner identities before querying", async () => {
  const harness = createHarness();

  await assert.rejects(
    () =>
      ensurePendingOffersForRunner({
        prisma: harness.prisma,
        runnerId: "not-a-runner",
      }),
    /valid runnerId/i
  );

  assert.equal(harness.calls.runFindMany.length, 0);
});
