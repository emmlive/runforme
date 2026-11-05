const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const runsPath = path.resolve("src", "routes", "runs.js");
const source = readFileSync(runsPath, "utf8");

test("runner GET /api/runs includes completed assigned runs for durable history", () => {
  assert.match(
    source,
    /assignedRunnerId:\s*userId,[\s\S]*?status:\s*\{\s*in:\s*\["assigned",\s*"arrived",\s*"in_progress",\s*"completed"\]\s*\}/,
    "runner assigned-run query must include completed runs"
  );
});

test("runner GET /api/runs still redacts assigned and completed run data", () => {
  assert.match(
    source,
    /\.\.\.assignedRuns\.map\(redactRunForRunner\),\s*\.\.\.offeredRuns/,
    "runner read response must continue to redact assigned/completed rows"
  );
});
