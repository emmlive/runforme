function requirePositiveWholeDollarHold(holdAmount) {
  if (!Number.isInteger(holdAmount) || holdAmount <= 0) {
    throw new Error("Secure Hold amount must be a positive whole-dollar integer");
  }

  return holdAmount;
}

function requireDependency(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

async function authorizeSecureHold({
  run,
  prisma,
  paymentService,
  releasePendingOffers,
}) {
  requireDependency(run, "run");
  requireDependency(prisma?.run?.update, "prisma.run.update");
  requireDependency(
    paymentService?.createAuthorization,
    "paymentService.createAuthorization"
  );
  requireDependency(
    paymentService?.retrieveAuthorization,
    "paymentService.retrieveAuthorization"
  );
  requireDependency(
    releasePendingOffers,
    "releasePendingOffers"
  );

  requirePositiveWholeDollarHold(run.holdAmount);

  if (
    run.authorizationStatus === "authorized" &&
    run.paymentStatus === "authorized"
  ) {
    return {
      state: "authorized",
      run,
      clientSecret: null,
    };
  }

  let paymentIntent;

  if (run.paymentIntentId) {
    paymentIntent = await paymentService.retrieveAuthorization(
      run.paymentIntentId
    );
  } else {
    paymentIntent = await paymentService.createAuthorization({
      runId: run.id,
      requesterId: run.requesterId,
      holdAmount: run.holdAmount,
    });

    run = await prisma.run.update({
      where: { id: run.id },
      data: {
        paymentIntentId: paymentIntent.id,
        authorizationStatus: "authorizing",
        paymentStatus: "pending_payment_method",
      },
    });
  }

  if (paymentIntent.status === "requires_capture") {
    run = await prisma.run.update({
      where: { id: run.id },
      data: {
        paymentIntentId: paymentIntent.id,
        authorizationStatus: "authorized",
        paymentStatus: "authorized",
      },
    });

    await releasePendingOffers(run.id);

    return {
      state: "authorized",
      run,
      clientSecret: null,
    };
  }

  return {
    state: "requires_confirmation",
    run,
    clientSecret: paymentIntent.client_secret || null,
  };
}

module.exports = {
  authorizeSecureHold,
};
