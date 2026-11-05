import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const runnerPath = path.resolve("src", "RunnerDashboard.jsx");
const source = readFileSync(runnerPath, "utf8");

test("runner fetch keeps completed rows for history across refresh", () => {
  assert.match(
    source,
    /r\.status === "in_progress"\s*\|\|\s*r\.status === "completed"/,
    "fetchRuns must retain completed runner rows"
  );

  assert.match(
    source,
    /const completedRuns = runs\.filter\([\s\S]*?r\.status === "completed"/,
    "RunnerDashboard must derive completedRuns from canonical state"
  );
});

test("runner command center uses live completedRuns instead of a hard-coded empty list", () => {
  const hardCodedEmptyCompleted = source.match(/completedRuns:\s*\[\]/g) || [];

  assert.equal(
    hardCodedEmptyCompleted.length,
    0,
    "RunnerDashboard must not hard-code completedRuns to an empty list"
  );

  const completedPasses = source.match(/completedRuns,\s*\n\s*focusedRun:/g) || [];

  assert.ok(
    completedPasses.length >= 2,
    "both runner command-center paths must receive live completedRuns"
  );
});

test("successful completion clears stale acceptance messaging", () => {
  assert.match(
    source,
    /if \(res\.success\) \{\s*setActionMessage\(\{ type: "success", text: "Run completed\." \}\);\s*setAcceptMessage\(null\);/,
    "markComplete success must clear the prior accept banner"
  );
});

test("Activity renders recent completed run history", () => {
  assert.match(
    source,
    /mobileSection === "activity"[\s\S]*?completedRuns\.slice\(0, 5\)\.map/,
    "Activity must render recent completed runs"
  );

  assert.match(
    source,
    /Completed · Earned \$\{Number\(run\.runnerPayout \?\? run\.payout \?\? 0\)\}/,
    "Activity history must show the completed run earnings"
  );
});
