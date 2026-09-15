function assertStripeClient(stripe) {
  if (
    !stripe ||
    !stripe.paymentIntents ||
    typeof stripe.paymentIntents.create !== "function" ||
    typeof stripe.paymentIntents.retrieve !== "function" ||
    typeof stripe.paymentIntents.capture !== "function" ||
    typeof stripe.paymentIntents.cancel !== "function"
  ) {
    throw new Error("Injected Stripe-compatible provider client is required");
  }
}

function assertWholeDollarPositiveAmount(amount) {
  if (!Number.isInteger(amount)) {
    throw new Error("Payment amount must be a whole-dollar integer");
  }

  if (amount <= 0) {
    throw new Error("Payment amount must be positive");
  }

  return amount;
}

function toMinorUnits(amount) {
  return assertWholeDollarPositiveAmount(amount) * 100;
}

function normalizeId(value, name) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`${name} is required`);
  }

  return String(value);
}

function operationKey(runId, operation) {
  return `run:${normalizeId(runId, "runId")}:${operation}`;
}

function createPaymentService({ stripe, currency }) {
  assertStripeClient(stripe);

  const normalizedCurrency = String(currency || "").trim().toLowerCase();

  if (!normalizedCurrency) {
    throw new Error("Payment currency is required");
  }

  return {
    async createAuthorization({
      runId,
      requesterId,
      holdAmount,
    }) {
      const normalizedRunId = normalizeId(runId, "runId");
      const normalizedRequesterId = normalizeId(
        requesterId,
        "requesterId"
      );

      return stripe.paymentIntents.create(
        {
          amount: toMinorUnits(holdAmount),
          currency: normalizedCurrency,
          capture_method: "manual",
          metadata: {
            runId: normalizedRunId,
            requesterId: normalizedRequesterId,
          },
        },
        {
          idempotencyKey: operationKey(
            normalizedRunId,
            "authorize"
          ),
        }
      );
    },

    async retrieveAuthorization(paymentIntentId) {
      return stripe.paymentIntents.retrieve(
        normalizeId(paymentIntentId, "paymentIntentId")
      );
    },

    async captureAuthorization({
      paymentIntentId,
      runId,
      amount,
    }) {
      const normalizedPaymentIntentId = normalizeId(
        paymentIntentId,
        "paymentIntentId"
      );

      const normalizedRunId = normalizeId(runId, "runId");

      return stripe.paymentIntents.capture(
        normalizedPaymentIntentId,
        {
          amount_to_capture: toMinorUnits(amount),
        },
        {
          idempotencyKey: operationKey(
            normalizedRunId,
            "capture"
          ),
        }
      );
    },

    async cancelAuthorization({
      paymentIntentId,
      runId,
    }) {
      const normalizedPaymentIntentId = normalizeId(
        paymentIntentId,
        "paymentIntentId"
      );

      const normalizedRunId = normalizeId(runId, "runId");

      return stripe.paymentIntents.cancel(
        normalizedPaymentIntentId,
        {},
        {
          idempotencyKey: operationKey(
            normalizedRunId,
            "cancel"
          ),
        }
      );
    },
  };
}

module.exports = {
  createPaymentService,
};
