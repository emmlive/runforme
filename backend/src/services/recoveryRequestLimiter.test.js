const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRecoveryRequestLimiter,
} = require("./recoveryRequestLimiter");

test("limiter allows exactly maxAttempts then blocks within the same window", () => {
  const limiter = createRecoveryRequestLimiter({
    maxAttempts: 3,
    windowMs: 60_000,
    now: () => 1_000,
  });

  assert.deepEqual(
    limiter.checkRecoveryRequest("ip:203.0.113.10"),
    { allowed: true, retryAfterMs: 0 }
  );

  assert.deepEqual(
    limiter.checkRecoveryRequest("ip:203.0.113.10"),
    { allowed: true, retryAfterMs: 0 }
  );

  assert.deepEqual(
    limiter.checkRecoveryRequest("ip:203.0.113.10"),
    { allowed: true, retryAfterMs: 0 }
  );

  const blocked =
    limiter.checkRecoveryRequest("ip:203.0.113.10");

  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 60_000);
});

test("limiter opens a fresh window after the configured window expires", () => {
  let currentTime = 1_000;

  const limiter = createRecoveryRequestLimiter({
    maxAttempts: 1,
    windowMs: 60_000,
    now: () => currentTime,
  });

  assert.equal(
    limiter.checkRecoveryRequest("email:person@example.test")
      .allowed,
    true
  );

  assert.equal(
    limiter.checkRecoveryRequest("email:person@example.test")
      .allowed,
    false
  );

  currentTime += 60_000;

  assert.deepEqual(
    limiter.checkRecoveryRequest("email:person@example.test"),
    { allowed: true, retryAfterMs: 0 }
  );
});

test("limiter keeps independent keys isolated", () => {
  const limiter = createRecoveryRequestLimiter({
    maxAttempts: 1,
    windowMs: 60_000,
    now: () => 1_000,
  });

  assert.equal(
    limiter.checkRecoveryRequest("ip:203.0.113.10")
      .allowed,
    true
  );

  assert.equal(
    limiter.checkRecoveryRequest("ip:203.0.113.10")
      .allowed,
    false
  );

  assert.equal(
    limiter.checkRecoveryRequest("ip:203.0.113.11")
      .allowed,
    true
  );

  assert.equal(
    limiter.checkRecoveryRequest("email:other@example.test")
      .allowed,
    true
  );
});

test("limiter exposes bounded key storage for production safety", () => {
  const limiter = createRecoveryRequestLimiter({
    maxAttempts: 1,
    windowMs: 60_000,
    maxKeys: 2,
    now: () => 1_000,
  });

  limiter.checkRecoveryRequest("key-a");
  limiter.checkRecoveryRequest("key-b");
  limiter.checkRecoveryRequest("key-c");

  assert.equal(
    typeof limiter.getTrackedKeyCount,
    "function",
    "limiter must expose test-only tracked-key count"
  );

  assert.ok(
    limiter.getTrackedKeyCount() <= 2,
    "limiter must not retain more than maxKeys buckets"
  );
});

test("expired buckets are removed during cleanup", () => {
  let currentTime = 1_000;

  const limiter = createRecoveryRequestLimiter({
    maxAttempts: 1,
    windowMs: 60_000,
    maxKeys: 100,
    now: () => currentTime,
  });

  limiter.checkRecoveryRequest("old-a");
  limiter.checkRecoveryRequest("old-b");

  currentTime += 60_001;

  limiter.checkRecoveryRequest("fresh");

  assert.equal(
    typeof limiter.getTrackedKeyCount,
    "function",
    "limiter must expose test-only tracked-key count"
  );

  assert.equal(
    limiter.getTrackedKeyCount(),
    1,
    "expired buckets should be removed when the limiter processes a new request"
  );
});