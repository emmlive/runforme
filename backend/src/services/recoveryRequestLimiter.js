function createRecoveryRequestLimiter({
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  maxKeys = 10_000,
  now = () => Date.now(),
} = {}) {
  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1
  ) {
    throw new Error("maxAttempts must be a positive integer");
  }

  if (
    !Number.isInteger(windowMs) ||
    windowMs < 1
  ) {
    throw new Error("windowMs must be a positive integer");
  }

  if (
    !Number.isInteger(maxKeys) ||
    maxKeys < 1
  ) {
    throw new Error("maxKeys must be a positive integer");
  }

  const buckets = new Map();

  function removeExpiredBuckets(currentTime) {
    for (const [key, bucket] of buckets.entries()) {
      if (
        currentTime - bucket.windowStartedAt >= windowMs
      ) {
        buckets.delete(key);
      }
    }
  }

  function makeRoomForNewKey() {
    while (buckets.size >= maxKeys) {
      const oldestKey = buckets.keys().next().value;

      if (oldestKey === undefined) {
        break;
      }

      buckets.delete(oldestKey);
    }
  }

  function checkRecoveryRequest(key) {
    const normalizedKey =
      typeof key === "string" && key.trim()
        ? key.trim()
        : "anonymous";

    const currentTime = now();

    removeExpiredBuckets(currentTime);

    const existing = buckets.get(normalizedKey);

    if (!existing) {
      makeRoomForNewKey();

      buckets.set(normalizedKey, {
        count: 1,
        windowStartedAt: currentTime,
      });

      return {
        allowed: true,
        retryAfterMs: 0,
      };
    }

    if (existing.count >= maxAttempts) {
      return {
        allowed: false,
        retryAfterMs: Math.max(
          0,
          windowMs - (currentTime - existing.windowStartedAt)
        ),
      };
    }

    existing.count += 1;

    return {
      allowed: true,
      retryAfterMs: 0,
    };
  }

  function getTrackedKeyCount() {
    return buckets.size;
  }

  return {
    checkRecoveryRequest,
    getTrackedKeyCount,
  };
}

const recoveryRequestLimiter =
  createRecoveryRequestLimiter();

module.exports = {
  createRecoveryRequestLimiter,
  recoveryRequestLimiter,
};