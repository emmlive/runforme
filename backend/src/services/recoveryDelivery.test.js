const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const deliveryPath = path.join(__dirname, "recoveryDelivery.js");

function loadDeliveryModule() {
  assert.ok(
    fs.existsSync(deliveryPath),
    "recoveryDelivery service must exist"
  );

  delete require.cache[require.resolve(deliveryPath)];
  return require(deliveryPath);
}

test("recovery delivery service exists", () => {
  assert.ok(
    fs.existsSync(deliveryPath),
    "recoveryDelivery service must exist"
  );
});

test("default recovery delivery is disabled", () => {
  const { recoveryDelivery } = loadDeliveryModule();

  assert.equal(typeof recoveryDelivery.isEnabled, "function");
  assert.equal(recoveryDelivery.isEnabled(), false);
});

test("disabled recovery delivery performs no external delivery", async () => {
  const { recoveryDelivery } = loadDeliveryModule();

  const result = await recoveryDelivery.deliverPasswordReset({
    email: "person@example.test",
    resetUrl: "https://example.test/reset-password?token=not-a-real-token",
    expiresAt: new Date("2030-01-01T00:30:00.000Z"),
  });

  assert.deepEqual(result, { delivered: false });
});

test("in-memory recovery delivery is enabled and captures one reset message", async () => {
  const { createInMemoryRecoveryDelivery } = loadDeliveryModule();
  const delivery = createInMemoryRecoveryDelivery();

  const message = {
    email: "person@example.test",
    resetUrl: "https://example.test/reset-password?token=test-token",
    expiresAt: new Date("2030-01-01T00:30:00.000Z"),
  };

  assert.equal(delivery.isEnabled(), true);

  const result = await delivery.deliverPasswordReset(message);

  assert.deepEqual(result, { delivered: true });
  assert.deepEqual(delivery.getDeliveries(), [message]);
});

test("in-memory recovery delivery does not write reset data to console", async () => {
  const { createInMemoryRecoveryDelivery } = loadDeliveryModule();
  const delivery = createInMemoryRecoveryDelivery();

  let consoleWrites = 0;
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = () => { consoleWrites += 1; };
  console.error = () => { consoleWrites += 1; };
  console.warn = () => { consoleWrites += 1; };

  try {
    await delivery.deliverPasswordReset({
      email: "person@example.test",
      resetUrl: "https://example.test/reset-password?token=test-token",
      expiresAt: new Date("2030-01-01T00:30:00.000Z"),
    });
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }

  assert.equal(consoleWrites, 0);
});
