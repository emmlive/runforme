const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createRunnerOfferPassService,
} = require("./services/runnerOfferPassService");

function createFakePrisma() {
  const offers = new Map([
    [1, { id: 1, runId: 701, runnerId: 12, status: "pending" }],
  ]);

  return {
    _offers: offers,
    offer: {
      async findFirst({ where }) {
        return (
          [...offers.values()].find(
            (offer) =>
              offer.runId === where.runId &&
              offer.runnerId === where.runnerId &&
              offer.status === where.status
          ) || null
        );
      },

      async updateMany({ where, data }) {
        const offer = offers.get(where.id);
        if (!offer || offer.status !== where.status) {
          return { count: 0 };
        }

        offers.set(where.id, { ...offer, ...data });
        return { count: 1 };
      },
    },
  };
}

test("passing a pending offer marks only that runner offer as passed", async () => {
  const prisma = createFakePrisma();
  const recorded = [];
  const service = createRunnerOfferPassService({
    prisma,
    pulseService: {
      async recordNonAcceptedOffer(input) {
        recorded.push(input);
      },
    },
  });

  const result = await service.passRunnerOffer({
    runnerId: 12,
    runId: 701,
  });

  assert.equal(result.passed, true);
  assert.equal(prisma._offers.get(1).status, "passed");
  assert.deepEqual(recorded, [{ runnerId: 12, runId: 701 }]);
});

test("passing the same run twice does not count twice", async () => {
  const prisma = createFakePrisma();
  let count = 0;
  const service = createRunnerOfferPassService({
    prisma,
    pulseService: {
      async recordNonAcceptedOffer() {
        count += 1;
      },
    },
  });

  assert.equal(
    (await service.passRunnerOffer({ runnerId: 12, runId: 701 })).passed,
    true
  );
  assert.equal(
    (await service.passRunnerOffer({ runnerId: 12, runId: 701 })).alreadyPassed,
    true
  );
  assert.equal(count, 1);
});

test("Pulse telemetry failure never blocks an otherwise valid pass", async () => {
  const prisma = createFakePrisma();
  const service = createRunnerOfferPassService({
    prisma,
    pulseService: {
      async recordNonAcceptedOffer() {
        throw new Error("pulse unavailable");
      },
    },
  });

  const result = await service.passRunnerOffer({
    runnerId: 12,
    runId: 701,
  });

  assert.equal(result.passed, true);
  assert.equal(result.pulseRecorded, false);
  assert.equal(prisma._offers.get(1).status, "passed");
});

test("invalid runner or run identifiers fail closed", async () => {
  const prisma = createFakePrisma();
  const service = createRunnerOfferPassService({
    prisma,
    pulseService: {
      async recordNonAcceptedOffer() {},
    },
  });

  await assert.rejects(
    service.passRunnerOffer({ runnerId: 0, runId: 701 }),
    /Invalid runnerId/
  );

  await assert.rejects(
    service.passRunnerOffer({ runnerId: 12, runId: "bad" }),
    /Invalid runId/
  );
});
