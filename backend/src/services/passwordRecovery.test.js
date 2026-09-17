const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const recoveryPath = path.join(__dirname, "passwordRecovery.js");

function loadRecoveryModule() {
  assert.ok(
    fs.existsSync(recoveryPath),
    "passwordRecovery service must exist"
  );

  delete require.cache[require.resolve(recoveryPath)];
  return require(recoveryPath);
}

function createHarness() {
  const now = new Date("2030-01-01T12:00:00.000Z");
  const persistenceCalls = {
    revoked: [],
    created: [],
  };
  const deliveries = [];
  const randomByteSizes = [];

  const prisma = {
    passwordResetToken: {
      async updateMany(args) {
        persistenceCalls.revoked.push(args);
        return { count: 0 };
      },

      async create(args) {
        persistenceCalls.created.push(args);
        return { id: 1, ...args.data };
      },
    },
  };

  const delivery = {
    isEnabled() {
      return true;
    },

    async deliverPasswordReset(message) {
      deliveries.push(message);
      return { delivered: true };
    },
  };

  const deterministicBytes = Buffer.from(
    Array.from({ length: 32 }, (_, index) => index)
  );

  function randomBytes(size) {
    randomByteSizes.push(size);
    return Buffer.from(deterministicBytes);
  }

  return {
    now,
    prisma,
    delivery,
    randomBytes,
    randomByteSizes,
    persistenceCalls,
    deliveries,
    deterministicBytes,
  };
}

test("password recovery service exists", () => {
  assert.ok(
    fs.existsSync(recoveryPath),
    "passwordRecovery service must exist"
  );
});

test("issue generates exactly 32 random bytes and a URL-safe raw token", async () => {
  const { createPasswordRecoveryService } = loadRecoveryModule();
  const harness = createHarness();

  const service = createPasswordRecoveryService({
    prisma: harness.prisma,
    delivery: harness.delivery,
    now: () => harness.now,
    randomBytes: harness.randomBytes,
  });

  await service.issuePasswordReset({
    userId: 42,
    email: "person@example.test",
    resetUrlBase: "https://example.test/reset-password",
  });

  assert.deepEqual(harness.randomByteSizes, [32]);
  assert.equal(harness.deliveries.length, 1);

  const resetUrl = new URL(harness.deliveries[0].resetUrl);
  const rawToken = resetUrl.searchParams.get("token");

  assert.ok(rawToken);
  assert.match(rawToken, /^[A-Za-z0-9_-]+$/);
  assert.equal(rawToken.length, 43);
});

test("issue persists SHA-256 token hash and never persists the raw token", async () => {
  const { createPasswordRecoveryService } = loadRecoveryModule();
  const harness = createHarness();

  const service = createPasswordRecoveryService({
    prisma: harness.prisma,
    delivery: harness.delivery,
    now: () => harness.now,
    randomBytes: harness.randomBytes,
  });

  await service.issuePasswordReset({
    userId: 42,
    email: "person@example.test",
    resetUrlBase: "https://example.test/reset-password",
  });

  assert.equal(harness.persistenceCalls.created.length, 1);
  assert.equal(harness.deliveries.length, 1);

  const persisted = harness.persistenceCalls.created[0].data;
  const resetUrl = new URL(harness.deliveries[0].resetUrl);
  const rawToken = resetUrl.searchParams.get("token");

  const expectedHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  assert.equal(persisted.userId, 42);
  assert.equal(persisted.tokenHash, expectedHash);
  assert.notEqual(persisted.tokenHash, rawToken);
  assert.equal(persisted.tokenHash.length, 64);

  const persistedJson = JSON.stringify(persisted);
  assert.equal(persistedJson.includes(rawToken), false);
  assert.equal(Object.hasOwn(persisted, "token"), false);
  assert.equal(Object.hasOwn(persisted, "rawToken"), false);
  assert.equal(Object.hasOwn(persisted, "resetUrl"), false);
});

test("issue stores an expiration exactly 30 minutes after issuance", async () => {
  const { createPasswordRecoveryService } = loadRecoveryModule();
  const harness = createHarness();

  const service = createPasswordRecoveryService({
    prisma: harness.prisma,
    delivery: harness.delivery,
    now: () => harness.now,
    randomBytes: harness.randomBytes,
  });

  await service.issuePasswordReset({
    userId: 42,
    email: "person@example.test",
    resetUrlBase: "https://example.test/reset-password",
  });

  assert.equal(harness.persistenceCalls.created.length, 1);
  assert.equal(harness.deliveries.length, 1);

  const persistedExpiry = harness.persistenceCalls.created[0].data.expiresAt;
  const deliveredExpiry = harness.deliveries[0].expiresAt;
  const expectedExpiry = new Date(harness.now.getTime() + 30 * 60 * 1000);

  assert.ok(persistedExpiry instanceof Date);
  assert.ok(deliveredExpiry instanceof Date);
  assert.equal(persistedExpiry.getTime(), expectedExpiry.getTime());
  assert.equal(deliveredExpiry.getTime(), expectedExpiry.getTime());
});

test("disabled delivery prevents token generation and recovery mutation", async () => {
  const { createPasswordRecoveryService } = loadRecoveryModule();

  let randomBytesCalls = 0;
  let updateManyCalls = 0;
  let createCalls = 0;
  let deliveryCalls = 0;

  const prisma = {
    passwordResetToken: {
      async updateMany() {
        updateManyCalls += 1;
        throw new Error("recovery mutation must not occur when delivery is disabled");
      },

      async create() {
        createCalls += 1;
        throw new Error("recovery token must not be persisted when delivery is disabled");
      },
    },
  };

  const delivery = {
    isEnabled() {
      return false;
    },

    async deliverPasswordReset() {
      deliveryCalls += 1;
      throw new Error("disabled delivery must never be invoked");
    },
  };

  function randomBytes() {
    randomBytesCalls += 1;
    throw new Error("raw token generation must not occur when delivery is disabled");
  }

  const service = createPasswordRecoveryService({
    prisma,
    delivery,
    now: () => new Date("2030-01-01T12:00:00.000Z"),
    randomBytes,
  });

  const result = await service.issuePasswordReset({
    userId: 42,
    email: "person@example.test",
    resetUrlBase: "https://example.test/reset-password",
  });

  assert.deepEqual(result, { issued: false });
  assert.equal(randomBytesCalls, 0);
  assert.equal(updateManyCalls, 0);
  assert.equal(createCalls, 0);
  assert.equal(deliveryCalls, 0);
});

function hashRawToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function createResetHarness(tokenRecord) {
  const now = new Date("2030-01-01T12:00:00.000Z");
  const calls = {
    findUnique: [],
    tokenUpdateMany: [],
    userUpdate: [],
    transactions: 0,
  };

  const tx = {
    passwordResetToken: {
      async findUnique(args) {
        calls.findUnique.push(args);
        return tokenRecord;
      },

      async updateMany(args) {
        calls.tokenUpdateMany.push(args);

        if (args.where && args.where.id !== undefined) {
          return { count: 1 };
        }

        return { count: 1 };
      },
    },

    user: {
      async update(args) {
        calls.userUpdate.push(args);
        return { id: args.where.id };
      },
    },
  };

  const prisma = {
    async $transaction(callback) {
      calls.transactions += 1;
      return callback(tx);
    },
  };

  return { now, prisma, tx, calls };
}

test("issue revokes prior unused tokens for the same user before creating a replacement", async () => {
  const { createPasswordRecoveryService } = loadRecoveryModule();
  const harness = createHarness();

  const service = createPasswordRecoveryService({
    prisma: harness.prisma,
    delivery: harness.delivery,
    now: () => harness.now,
    randomBytes: harness.randomBytes,
  });

  await service.issuePasswordReset({
    userId: 42,
    email: "person@example.test",
    resetUrlBase: "https://example.test/reset-password",
  });

  assert.equal(harness.persistenceCalls.revoked.length, 1);

  const revoke = harness.persistenceCalls.revoked[0];
  assert.equal(revoke.where.userId, 42);
  assert.equal(revoke.where.consumedAt, null);
  assert.equal(revoke.where.revokedAt, null);
  assert.ok(revoke.data.revokedAt instanceof Date);
  assert.equal(revoke.data.revokedAt.getTime(), harness.now.getTime());
});

test("reset rejects an unknown token generically", async () => {
  const { createPasswordRecoveryService } = loadRecoveryModule();
  const harness = createResetHarness(null);

  const service = createPasswordRecoveryService({
    prisma: harness.prisma,
    delivery: { isEnabled: () => true },
    now: () => harness.now,
  });

  const result = await service.resetPassword({
    token: "unknown-token",
    passwordHash: "hashed-new-password",
  });

  assert.deepEqual(result, { reset: false, reason: "invalid_or_expired" });
  assert.equal(harness.calls.userUpdate.length, 0);
});

test("reset rejects an expired token generically", async () => {
  const { createPasswordRecoveryService } = loadRecoveryModule();
  const rawToken = "expired-token";
  const harness = createResetHarness({
    id: 10,
    userId: 42,
    tokenHash: hashRawToken(rawToken),
    expiresAt: new Date("2030-01-01T11:59:59.000Z"),
    consumedAt: null,
    revokedAt: null,
  });

  const service = createPasswordRecoveryService({
    prisma: harness.prisma,
    delivery: { isEnabled: () => true },
    now: () => harness.now,
  });

  const result = await service.resetPassword({
    token: rawToken,
    passwordHash: "hashed-new-password",
  });

  assert.deepEqual(result, { reset: false, reason: "invalid_or_expired" });
  assert.equal(harness.calls.userUpdate.length, 0);
});

test("reset rejects an already-consumed token generically", async () => {
  const { createPasswordRecoveryService } = loadRecoveryModule();
  const rawToken = "consumed-token";
  const harness = createResetHarness({
    id: 11,
    userId: 42,
    tokenHash: hashRawToken(rawToken),
    expiresAt: new Date("2030-01-01T12:30:00.000Z"),
    consumedAt: new Date("2030-01-01T11:55:00.000Z"),
    revokedAt: null,
  });

  const service = createPasswordRecoveryService({
    prisma: harness.prisma,
    delivery: { isEnabled: () => true },
    now: () => harness.now,
  });

  const result = await service.resetPassword({
    token: rawToken,
    passwordHash: "hashed-new-password",
  });

  assert.deepEqual(result, { reset: false, reason: "invalid_or_expired" });
  assert.equal(harness.calls.userUpdate.length, 0);
});

test("reset rejects a revoked token generically", async () => {
  const { createPasswordRecoveryService } = loadRecoveryModule();
  const rawToken = "revoked-token";
  const harness = createResetHarness({
    id: 12,
    userId: 42,
    tokenHash: hashRawToken(rawToken),
    expiresAt: new Date("2030-01-01T12:30:00.000Z"),
    consumedAt: null,
    revokedAt: new Date("2030-01-01T11:58:00.000Z"),
  });

  const service = createPasswordRecoveryService({
    prisma: harness.prisma,
    delivery: { isEnabled: () => true },
    now: () => harness.now,
  });

  const result = await service.resetPassword({
    token: rawToken,
    passwordHash: "hashed-new-password",
  });

  assert.deepEqual(result, { reset: false, reason: "invalid_or_expired" });
  assert.equal(harness.calls.userUpdate.length, 0);
});

test("successful reset consumes the token, revokes siblings, updates password, and increments sessionVersion", async () => {
  const { createPasswordRecoveryService } = loadRecoveryModule();
  const rawToken = "valid-token";
  const harness = createResetHarness({
    id: 13,
    userId: 42,
    tokenHash: hashRawToken(rawToken),
    expiresAt: new Date("2030-01-01T12:30:00.000Z"),
    consumedAt: null,
    revokedAt: null,
  });

  const service = createPasswordRecoveryService({
    prisma: harness.prisma,
    delivery: { isEnabled: () => true },
    now: () => harness.now,
  });

  const result = await service.resetPassword({
    token: rawToken,
    passwordHash: "hashed-new-password",
  });

  assert.deepEqual(result, { reset: true });
  assert.equal(harness.calls.transactions, 1);

  assert.equal(harness.calls.findUnique.length, 1);
  assert.equal(
    harness.calls.findUnique[0].where.tokenHash,
    hashRawToken(rawToken)
  );

  assert.equal(harness.calls.userUpdate.length, 1);
  assert.deepEqual(harness.calls.userUpdate[0], {
    where: { id: 42 },
    data: {
      password: "hashed-new-password",
      sessionVersion: { increment: 1 },
    },
  });

  assert.equal(harness.calls.tokenUpdateMany.length, 2);

  const consume = harness.calls.tokenUpdateMany[0];
  assert.equal(consume.where.id, 13);
  assert.equal(consume.where.consumedAt, null);
  assert.equal(consume.where.revokedAt, null);
  assert.ok(consume.data.consumedAt instanceof Date);
  assert.equal(consume.data.consumedAt.getTime(), harness.now.getTime());

  const revokeSiblings = harness.calls.tokenUpdateMany[1];
  assert.equal(revokeSiblings.where.userId, 42);
  assert.deepEqual(revokeSiblings.where.id, { not: 13 });
  assert.equal(revokeSiblings.where.consumedAt, null);
  assert.equal(revokeSiblings.where.revokedAt, null);
  assert.ok(revokeSiblings.data.revokedAt instanceof Date);
  assert.equal(revokeSiblings.data.revokedAt.getTime(), harness.now.getTime());
});

test("concurrent reset attempts allow exactly one password and session transition", async () => {
  const { createPasswordRecoveryService } = loadRecoveryModule();

  const now = new Date("2030-01-01T12:00:00.000Z");
  const rawToken = "shared-valid-token";
  const tokenHash = hashRawToken(rawToken);

  let consumeAvailable = true;
  let consumeAttempts = 0;
  let consumeSuccesses = 0;
  let userUpdates = 0;
  let sessionVersionIncrements = 0;
  let siblingRevocations = 0;
  let transactions = 0;

  const tokenRecord = {
    id: 20,
    userId: 42,
    tokenHash,
    expiresAt: new Date("2030-01-01T12:30:00.000Z"),
    consumedAt: null,
    revokedAt: null,
  };

  const tx = {
    passwordResetToken: {
      async findUnique(args) {
        assert.equal(args.where.tokenHash, tokenHash);
        return { ...tokenRecord };
      },

      async updateMany(args) {
        if (args.where && args.where.id === 20) {
          consumeAttempts += 1;

          assert.equal(args.where.consumedAt, null);
          assert.equal(args.where.revokedAt, null);

          if (!consumeAvailable) {
            return { count: 0 };
          }

          consumeAvailable = false;
          consumeSuccesses += 1;
          return { count: 1 };
        }

        siblingRevocations += 1;
        return { count: 1 };
      },
    },

    user: {
      async update(args) {
        userUpdates += 1;

        assert.equal(args.where.id, 42);
        assert.equal(args.data.password, "hashed-new-password");
        assert.deepEqual(args.data.sessionVersion, { increment: 1 });

        sessionVersionIncrements += args.data.sessionVersion.increment;

        return { id: 42 };
      },
    },
  };

  const prisma = {
    async $transaction(callback) {
      transactions += 1;

      await new Promise((resolve) => setImmediate(resolve));
      return callback(tx);
    },
  };

  const service = createPasswordRecoveryService({
    prisma,
    delivery: { isEnabled: () => true },
    now: () => now,
  });

  const results = await Promise.all([
    service.resetPassword({
      token: rawToken,
      passwordHash: "hashed-new-password",
    }),
    service.resetPassword({
      token: rawToken,
      passwordHash: "hashed-new-password",
    }),
  ]);

  const successes = results.filter((result) => result.reset === true);
  const rejections = results.filter(
    (result) =>
      result.reset === false &&
      result.reason === "invalid_or_expired"
  );

  assert.equal(transactions, 2);
  assert.equal(consumeAttempts, 2);
  assert.equal(consumeSuccesses, 1);
  assert.equal(successes.length, 1);
  assert.equal(rejections.length, 1);
  assert.equal(userUpdates, 1);
  assert.equal(sessionVersionIncrements, 1);
  assert.equal(siblingRevocations, 1);
});
