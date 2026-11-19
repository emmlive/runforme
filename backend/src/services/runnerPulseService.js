const PULSE_TRIGGER_COUNT = 3;
const PULSE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MISSED_OFFER_TRIGGER = "offer_not_accepted";
const ELIGIBILITY_TRIGGER = "three_non_accepted_offers";
const FEEDBACK_TRIGGER = "pulse_feedback";

const VALID_PULSE_REASONS = new Set([
  "closer_to_me",
  "better_value",
  "better_timing",
  "different_errand",
  "done_for_now",
  "something_else",
]);

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${name}`);
  }
}

function createRunnerPulseService({
  prisma,
  now = () => new Date(),
} = {}) {
  if (!prisma) {
    throw new Error("Pulse prisma dependency is required");
  }

  async function recordNonAcceptedOffer({ runnerId, runId }) {
    assertPositiveInteger(runnerId, "runnerId");
    assertPositiveInteger(runId, "runId");

    try {
      return await prisma.$transaction(async (tx) => {
        const dedupeKey = `${MISSED_OFFER_TRIGGER}:${runnerId}:${runId}`;

        const existingEvent = await tx.runnerPulseEvent.findUnique({
          where: { dedupeKey },
        });

        if (existingEvent) {
          const state = await tx.runnerPulseState.findUnique({
            where: { runnerId },
          });

          return {
            counted: false,
            missCount: state?.consecutiveMisses ?? existingEvent.missCount,
          };
        }

        const state = await tx.runnerPulseState.upsert({
          where: { runnerId },
          create: {
            runnerId,
            consecutiveMisses: 1,
            lastMissedRunId: runId,
          },
          update: {
            consecutiveMisses: { increment: 1 },
            lastMissedRunId: runId,
          },
        });

        await tx.runnerPulseEvent.create({
          data: {
            runnerId,
            trigger: MISSED_OFFER_TRIGGER,
            runId,
            dedupeKey,
            missCount: state.consecutiveMisses,
            dismissed: false,
          },
        });

        return {
          counted: true,
          missCount: state.consecutiveMisses,
        };
      });
    } catch (error) {
      if (error?.code === "P2002") {
        const state = await prisma.runnerPulseState.findUnique({
          where: { runnerId },
        });

        return {
          counted: false,
          missCount: state?.consecutiveMisses ?? 0,
        };
      }

      throw error;
    }
  }

  async function resetPulseMisses({ runnerId }) {
    assertPositiveInteger(runnerId, "runnerId");

    const state = await prisma.runnerPulseState.upsert({
      where: { runnerId },
      create: {
        runnerId,
        consecutiveMisses: 0,
        lastMissedRunId: null,
      },
      update: {
        consecutiveMisses: 0,
        lastMissedRunId: null,
      },
    });

    return {
      missCount: state.consecutiveMisses,
    };
  }

  async function getPulseEligibility({ runnerId, hasActiveRun = false }) {
    assertPositiveInteger(runnerId, "runnerId");

    const state = await prisma.runnerPulseState.findUnique({
      where: { runnerId },
    });

    const missCount = state?.consecutiveMisses ?? 0;

    if (hasActiveRun || missCount < PULSE_TRIGGER_COUNT) {
      return {
        eligible: false,
        trigger: ELIGIBILITY_TRIGGER,
        missCount,
      };
    }

    const currentTime = now();
    const cooldownCutoff = new Date(
      currentTime.getTime() - PULSE_COOLDOWN_MS
    );

    const claimed = await prisma.runnerPulseState.updateMany({
      where: {
        runnerId,
        consecutiveMisses: { gte: PULSE_TRIGGER_COUNT },
        OR: [
          { lastPromptedAt: null },
          { lastPromptedAt: { lte: cooldownCutoff } },
        ],
      },
      data: { lastPromptedAt: currentTime },
    });

    return {
      eligible: claimed.count === 1,
      trigger: ELIGIBILITY_TRIGGER,
      missCount,
    };
  }

  async function recordPulseResponse({
    runnerId,
    reason = null,
    dismissed = false,
  }) {
    assertPositiveInteger(runnerId, "runnerId");

    if (dismissed && reason) {
      throw new Error("Pulse dismissal cannot include a reason");
    }

    if (!dismissed && !VALID_PULSE_REASONS.has(reason)) {
      throw new Error("Invalid Pulse reason");
    }

    const currentTime = now();

    return prisma.$transaction(async (tx) => {
      const state = await tx.runnerPulseState.findUnique({
        where: { runnerId },
      });

      const event = await tx.runnerPulseEvent.create({
        data: {
          runnerId,
          trigger: FEEDBACK_TRIGGER,
          runId: null,
          dedupeKey: null,
          missCount: state?.consecutiveMisses ?? 0,
          reason: dismissed ? null : reason,
          dismissed: Boolean(dismissed),
          respondedAt: dismissed ? null : currentTime,
        },
      });

      await tx.runnerPulseState.upsert({
        where: { runnerId },
        create: {
          runnerId,
          consecutiveMisses: 0,
          lastMissedRunId: null,
          lastPromptedAt: state?.lastPromptedAt ?? currentTime,
        },
        update: {
          consecutiveMisses: 0,
          lastMissedRunId: null,
        },
      });

      return event;
    });
  }

  return {
    recordNonAcceptedOffer,
    resetPulseMisses,
    getPulseEligibility,
    recordPulseResponse,
  };
}

module.exports = {
  PULSE_TRIGGER_COUNT,
  PULSE_COOLDOWN_MS,
  VALID_PULSE_REASONS,
  createRunnerPulseService,
};
