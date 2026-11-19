function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${name}`);
  }
}

function createRunnerOfferPassService({
  prisma,
  pulseService,
  logger = console,
} = {}) {
  if (!prisma?.offer) {
    throw new Error("Prisma offer client is required");
  }

  if (!pulseService?.recordNonAcceptedOffer) {
    throw new Error("Pulse service is required");
  }

  async function passRunnerOffer({ runnerId, runId }) {
    assertPositiveInteger(runnerId, "runnerId");
    assertPositiveInteger(runId, "runId");

    const offer = await prisma.offer.findFirst({
      where: {
        runId,
        runnerId,
        status: "pending",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!offer) {
      return {
        passed: false,
        alreadyPassed: true,
        pulseRecorded: false,
      };
    }

    const updated = await prisma.offer.updateMany({
      where: {
        id: offer.id,
        runnerId,
        status: "pending",
      },
      data: {
        status: "passed",
      },
    });

    if (updated.count !== 1) {
      return {
        passed: false,
        alreadyPassed: true,
        pulseRecorded: false,
      };
    }

    let pulseRecorded = true;

    try {
      await pulseService.recordNonAcceptedOffer({
        runnerId,
        runId,
      });
    } catch (error) {
      pulseRecorded = false;
      logger.error?.("Runner Pulse pass telemetry failed:", error);
    }

    return {
      passed: true,
      alreadyPassed: false,
      pulseRecorded,
      offerId: offer.id,
    };
  }

  return {
    passRunnerOffer,
  };
}

module.exports = {
  createRunnerOfferPassService,
};
