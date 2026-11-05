function requireRunnerId(value) {
  const runnerId = Number(value);

  if (!Number.isInteger(runnerId) || runnerId <= 0) {
    throw new Error("A valid runnerId is required");
  }

  return runnerId;
}

async function ensurePendingOffersForRunner({ prisma, runnerId }) {
  if (!prisma?.run || !prisma?.offer) {
    throw new Error("Prisma run and offer clients are required");
  }

  const safeRunnerId = requireRunnerId(runnerId);

  const dispatchableRuns = await prisma.run.findMany({
    where: {
      status: "open",
      assignedRunnerId: null,
      handoffEligibility: "eligible",
      OR: [
        { holdAmount: 0 },
        { authorizationStatus: "authorized" },
      ],
      offers: {
        none: {
          runnerId: safeRunnerId,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const created = [];

  for (const run of dispatchableRuns) {
    const existingOffer = await prisma.offer.findFirst({
      where: {
        runId: run.id,
        runnerId: safeRunnerId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingOffer) {
      continue;
    }

    const offer = await prisma.offer.create({
      data: {
        runId: run.id,
        runnerId: safeRunnerId,
        message: "New run available",
        status: "pending",
      },
    });

    created.push({ run, offer });
  }

  return created;
}

module.exports = {
  ensurePendingOffersForRunner,
};
