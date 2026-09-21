const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createProductionRecoveryDelivery,
} = require("./recoveryDelivery");

function createFetchRecorder({
  ok = true,
  status = 200,
} = {}) {
  const calls = [];

  const fetchImpl = async (...args) => {
    calls.push(args);

    return {
      ok,
      status,
      async text() {
        return ok ? "" : "provider failure";
      },
    };
  };

  return {
    fetchImpl,
    calls,
  };
}

test("production recovery delivery stays disabled without explicit enable flag", () => {
  assert.equal(
    typeof createProductionRecoveryDelivery,
    "function",
    "recoveryDelivery must export createProductionRecoveryDelivery"
  );

  const delivery = createProductionRecoveryDelivery({
    enabled: false,
    apiKey: "test-api-key",
    fromEmail: "RUNFORME <recovery@example.test>",
    fetchImpl: async () => {
      throw new Error("fetch must not be called");
    },
  });

  assert.equal(delivery.isEnabled(), false);
});

test("production recovery delivery fails closed when required provider configuration is missing", () => {
  assert.equal(typeof createProductionRecoveryDelivery, "function");

  const missingKey = createProductionRecoveryDelivery({
    enabled: true,
    apiKey: "",
    fromEmail: "RUNFORME <recovery@example.test>",
    fetchImpl: async () => {},
  });

  const missingSender = createProductionRecoveryDelivery({
    enabled: true,
    apiKey: "test-api-key",
    fromEmail: "",
    fetchImpl: async () => {},
  });

  assert.equal(missingKey.isEnabled(), false);
  assert.equal(missingSender.isEnabled(), false);
});

test("enabled production recovery delivery sends one Resend request with reset message fields", async () => {
  assert.equal(typeof createProductionRecoveryDelivery, "function");

  const recorder = createFetchRecorder();

  const delivery = createProductionRecoveryDelivery({
    enabled: true,
    apiKey: "test-api-key",
    fromEmail: "RUNFORME <recovery@example.test>",
    fetchImpl: recorder.fetchImpl,
  });

  assert.equal(delivery.isEnabled(), true);

  const result = await delivery.deliverPasswordReset({
    email: "person@example.test",
    resetUrl:
      "https://runforme-frontend.onrender.com/reset-password?token=synthetic-token",
    expiresAt: new Date("2030-01-01T00:30:00.000Z"),
  });

  assert.deepEqual(result, { delivered: true });
  assert.equal(recorder.calls.length, 1);

  const [url, options] = recorder.calls[0];

  assert.equal(url, "https://api.resend.com/emails");
  assert.equal(options.method, "POST");
  assert.equal(
    options.headers.Authorization,
    "Bearer test-api-key"
  );

  const body = JSON.parse(options.body);

  assert.equal(body.from, "RUNFORME <recovery@example.test>");
  assert.deepEqual(body.to, ["person@example.test"]);

  const serialized = JSON.stringify(body);

  assert.ok(
    serialized.includes(
      "https://runforme-frontend.onrender.com/reset-password?token=synthetic-token"
    ),
    "provider payload must contain the reset URL"
  );
});

test("provider failure throws without logging reset credentials", async () => {
  assert.equal(typeof createProductionRecoveryDelivery, "function");

  const recorder = createFetchRecorder({
    ok: false,
    status: 503,
  });

  const delivery = createProductionRecoveryDelivery({
    enabled: true,
    apiKey: "test-api-key",
    fromEmail: "RUNFORME <recovery@example.test>",
    fetchImpl: recorder.fetchImpl,
  });

  let consoleWrites = 0;

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = () => {
    consoleWrites += 1;
  };

  console.error = () => {
    consoleWrites += 1;
  };

  console.warn = () => {
    consoleWrites += 1;
  };

  try {
    await assert.rejects(
      () =>
        delivery.deliverPasswordReset({
          email: "person@example.test",
          resetUrl:
            "https://runforme-frontend.onrender.com/reset-password?token=synthetic-token",
          expiresAt: new Date("2030-01-01T00:30:00.000Z"),
        }),
      /delivery failed/i
    );
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }

  assert.equal(consoleWrites, 0);
});