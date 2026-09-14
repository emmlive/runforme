const {
  evaluateCaptureEligibility,
} = require("./runPaymentPolicy");

function requireDependency(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function requireRunIdentity(run) {
  requireDependency(run, "run");

  if (!run.id) {
    throw new Error("run.id is required");
  }

  return run;
}

async function captureRunPayment({
  run,
  prisma,
  paymentService,
}) {
  requireRunIdentity(run);
  requireDependency(prisma?.run?.update, "prisma.run.update");
  requireDependency(
    paymentService?.captureAuthorization,
    "paymentService.captureAuthorization"
  );

  if (run.paymentStatus === "captured") {
    return {
      run,
      captureAmount: null,
      alreadyCaptured: true,
    };
  }

  if (!run.paymentIntentId) {
    throw new Error("PaymentIntent is required before capture");
  }

  const eligibility = evaluateCaptureEligibility(run);

  if (!eligibility.eligible) {
    throw new Error(
      `Payment capture blocked: ${eligibility.reason}`
    );
  }

  const providerResult =
    await paymentService.captureAuthorization({
      paymentIntentId: run.paymentIntentId,
      runId: run.id,
      amount: eligibility.captureAmount,
    });

  if (providerResult?.status !== "succeeded") {
    throw new Error(
      "Provider capture did not reach succeeded status"
    );
  }

  const updatedRun = await prisma.run.update({
    where: { id: run.id },
    data: {
      paymentStatus: "captured",
      payoutStatus: "ready_for_payout",
    },
  });

  return {
    run: updatedRun,
    captureAmount: eligibility.captureAmount,
    alreadyCaptured: false,
  };
}

async function releaseRunAuthorization({
  run,
  prisma,
  paymentService,
}) {
  requireRunIdentity(run);
  requireDependency(prisma?.run?.update, "prisma.run.update");
  requireDependency(
    paymentService?.cancelAuthorization,
    "paymentService.cancelAuthorization"
  );

  if (run.paymentStatus === "captured") {
    throw new Error(
      "Captured payment cannot be released or canceled"
    );
  }

  if (!run.paymentIntentId) {
    throw new Error(
      "PaymentIntent is required before authorization release"
    );
  }

  const providerResult =
    await paymentService.cancelAuthorization({
      paymentIntentId: run.paymentIntentId,
      runId: run.id,
    });

  if (providerResult?.status !== "canceled") {
    throw new Error(
      "Provider authorization cancellation did not reach canceled status"
    );
  }

  const updatedRun = await prisma.run.update({
    where: { id: run.id },
    data: {
      authorizationStatus: "canceled",
      paymentStatus: "canceled",
      payoutStatus: "not_ready",
    },
  });

  return {
    run: updatedRun,
  };
}

module.exports = {
  captureRunPayment,
  releaseRunAuthorization,
};
