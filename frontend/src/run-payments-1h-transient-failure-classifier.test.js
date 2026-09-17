import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

test("network failures classify to safe retryable UI copy", async () => {
  const helperPath = path.resolve(
    "src",
    "lib",
    "transientFailure.js"
  );

  assert.equal(
    existsSync(helperPath),
    true,
    "transientFailure.js must exist before network failures can be classified"
  );

  const {
    classifyTransientFailure
  } = await import(pathToFileURL(helperPath).href);

  const result = classifyTransientFailure(
    new Error("Network Error")
  );

  assert.deepEqual(result, {
    kind: "network",
    message: "Something went wrong. Try again.",
    retryable: true
  });
});

test("server 5xx failures classify to safe retryable UI copy", async () => {
  const helperPath = path.resolve(
    "src",
    "lib",
    "transientFailure.js"
  );

  const {
    classifyTransientFailure
  } = await import(pathToFileURL(helperPath).href);

  const error = new Error("Internal Server Error");
  error.response = {
    status: 503,
    data: {
      error: "database connection failed"
    }
  };

  const result = classifyTransientFailure(error);

  assert.deepEqual(result, {
    kind: "server",
    message: "Something went wrong. Try again.",
    retryable: true
  });
});
test("client 4xx errors remain non-retryable API failures", async () => {
  const helperPath = path.resolve(
    "src",
    "lib",
    "transientFailure.js"
  );

  const {
    classifyTransientFailure
  } = await import(pathToFileURL(helperPath).href);

  const error = new Error("Bad Request");
  error.response = {
    status: 400,
    data: {
      error: "Invalid request"
    }
  };

  const result = classifyTransientFailure(error);

  assert.deepEqual(result, {
    kind: "api",
    message: "Something went wrong.",
    retryable: false
  });
});

test("HTTP application failures with a response status are non-retryable API failures", async () => {
  const helperPath = path.resolve(
    "src",
    "lib",
    "transientFailure.js"
  );

  const {
    classifyTransientFailure
  } = await import(pathToFileURL(helperPath).href);

  const error = new Error("Application rejected request");

  error.response = {
    status: 200,
  };

  assert.deepEqual(
    classifyTransientFailure(error),
    {
      kind: "api",
      message: "Something went wrong.",
      retryable: false,
    }
  );
});
