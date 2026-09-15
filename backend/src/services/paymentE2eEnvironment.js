function normalize(value) {
  return String(value || "").trim();
}

function assertIsolatedPaymentE2eEnvironment({
  nodeEnv,
  stripeSecretKey,
  databaseUrl,
}) {
  const environment = normalize(nodeEnv).toLowerCase();

  if (environment === "production") {
    throw new Error(
      "Production runtime is not allowed for isolated payment E2E validation"
    );
  }

  const stripeKey = normalize(stripeSecretKey);

  if (!stripeKey.startsWith("sk_test_")) {
    throw new Error(
      "Only Stripe test credentials are allowed for isolated payment E2E validation"
    );
  }

  let parsedDatabaseUrl;

  try {
    parsedDatabaseUrl = new URL(normalize(databaseUrl));
  } catch {
    throw new Error(
      "A valid isolated local PostgreSQL database URL is required"
    );
  }

  if (
    parsedDatabaseUrl.protocol !== "postgresql:" &&
    parsedDatabaseUrl.protocol !== "postgres:"
  ) {
    throw new Error(
      "The isolated payment E2E database must use PostgreSQL"
    );
  }

  const localHosts = new Set([
    "127.0.0.1",
    "localhost",
    "::1",
    "[::1]",
  ]);

  if (!localHosts.has(parsedDatabaseUrl.hostname)) {
    throw new Error(
      "The payment E2E database must be an isolated local database"
    );
  }

  return {
    stripeMode: "test",
    databaseScope: "local_isolated",
  };
}

module.exports = {
  assertIsolatedPaymentE2eEnvironment,
};