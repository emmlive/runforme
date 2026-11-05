import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const runnerPath = path.resolve("src", "RunnerDashboard.jsx");
const source = readFileSync(runnerPath, "utf8");

test("stale-run cleanup retains completed runs for durable history", () => {
  const cleanupMatch = source.match(
    /\/\/ CLEANUP STALE RUNS[\s\S]*?useEffect\(\(\) => \{[\s\S]*?setInterval\(\(\) => \{[\s\S]*?setRuns\(\(prev\) =>[\s\S]*?prev\.filter\([\s\S]*?\)[\s\S]*?\);/
  );

  assert.ok(cleanupMatch, "expected stale-run cleanup effect");

  assert.doesNotMatch(
    cleanupMatch[0],
    /r\.status !== "completed"/,
    "completed runs must not be removed by stale-run cleanup"
  );

  assert.match(
    cleanupMatch[0],
    /r\.status !== "cancelled"/,
    "cancelled runs may continue to be removed from active/history state"
  );
});

test("completed runs still feed the runner completed history", () => {
  assert.match(
    source,
    /const completedRuns = runs\.filter\([\s\S]*?r\.status === "completed"/,
    "completed history must continue to derive from retained run state"
  );
});
