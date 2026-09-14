function requireWholeDollarAmount(value, fieldName) {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} amount is required`);
  }

  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} amount must be an integer`);
  }

  if (value < 0) {
    throw new Error(`${fieldName} amount cannot be negative`);
  }

  return value;
}

function computeCaptureAmount(run) {
  const receiptAmount = requireWholeDollarAmount(
    run?.receiptAmount,
    "receipt"
  );

  const runnerPayout = requireWholeDollarAmount(
    run?.runnerPayout,
    "runner payout"
  );

  const platformFee = requireWholeDollarAmount(
    run?.platformFee,
    "platform fee"
  );

  return receiptAmount + runnerPayout + platformFee;
}

function isProviderAuthorized(run) {
  return run?.authorizationStatus === "authorized";
}

function requiresProviderAuthorization(run) {
  const holdAmount = Number(run?.holdAmount || 0);

  return holdAmount > 0 && !isProviderAuthorized(run);
}

function evaluateCaptureEligibility(run) {
  if (!isProviderAuthorized(run)) {
    return {
      eligible: false,
      reason: "provider authorization required",
      captureAmount: null,
    };
  }

  if (!run?.deliveryConfirmedAt) {
    return {
      eligible: false,
      reason: "delivery confirmation required",
      captureAmount: null,
    };
  }

  if (run?.requiresManualReview === true) {
    return {
      eligible: false,
      reason: "manual review required",
      captureAmount: null,
    };
  }

  const hasExplicitMaxRunnerSpend =
    run?.maxRunnerSpend !== undefined &&
    run?.maxRunnerSpend !== null;

  const receiptIsRequired =
    hasExplicitMaxRunnerSpend
      ? Number(run.maxRunnerSpend) > 0
      : (
          run?.receiptStatus === "uploaded" ||
          (
            run?.receiptAmount !== undefined &&
            run?.receiptAmount !== null
          )
        );

  if (
    receiptIsRequired &&
    run?.receiptStatus !== "uploaded"
  ) {
    return {
      eligible: false,
      reason: "receipt upload required",
      captureAmount: null,
    };
  }

  const captureAmount = computeCaptureAmount({
    ...run,
    receiptAmount:
      receiptIsRequired
        ? run?.receiptAmount
        : 0,
  });

  const holdAmount = requireWholeDollarAmount(
    run?.holdAmount,
    "hold"
  );

  if (captureAmount <= 0) {
    return {
      eligible: false,
      reason: "capture amount must be positive",
      captureAmount,
    };
  }

  if (captureAmount > holdAmount) {
    return {
      eligible: false,
      reason: "capture amount exceeds authorized hold; manual review required",
      captureAmount,
    };
  }

  return {
    eligible: true,
    reason: "eligible",
    captureAmount,
  };
}

function payoutStatusAfterCapture(paymentStatus) {
  return paymentStatus === "captured"
    ? "ready_for_payout"
    : "not_ready";
}

module.exports = {
  computeCaptureAmount,
  requiresProviderAuthorization,
  isProviderAuthorized,
  evaluateCaptureEligibility,
  payoutStatusAfterCapture,
};
