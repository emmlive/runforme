function normalize(value) {
  return String(value || "").trim();
}

function classifyStripeKey(stripeSecretKey) {
  const key = normalize(stripeSecretKey);

  if (key.startsWith("sk_test_")) {
    return "test";
  }

  if (key.startsWith("sk_live_")) {
    return "live";
  }

  return "unknown";
}

function isExplicitlyAuthorized(value) {
  return normalize(value).toLowerCase() === "true";
}

function assertPaymentRuntimeAuthorized({
  nodeEnv,
  stripeSecretKey,
  livePaymentsAuthorized,
}) {
  const environment = normalize(nodeEnv).toLowerCase();
  const keyClass = classifyStripeKey(stripeSecretKey);
  const liveAuthorized = isExplicitlyAuthorized(
    livePaymentsAuthorized
  );

  if (keyClass === "live") {
    if (environment !== "production") {
      throw new Error(
        "Live Stripe payments require the production environment"
      );
    }

    if (!liveAuthorized) {
      throw new Error(
        "Live payments are not authorized"
      );
    }

    return {
      mode: "live",
    };
  }

  if (environment === "production") {
    if (keyClass === "test") {
      throw new Error(
        "Production payments require a live Stripe credential"
      );
    }

    throw new Error(
      "Stripe credential class is not valid for production"
    );
  }

  if (keyClass !== "test") {
    throw new Error(
      "Stripe credential class is not recognized"
    );
  }

  return {
    mode: "test",
  };
}

module.exports = {
  assertPaymentRuntimeAuthorized,
};
