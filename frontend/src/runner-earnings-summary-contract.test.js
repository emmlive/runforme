import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const runnerPath = path.resolve("src", "RunnerDashboard.jsx");
const source = readFileSync(runnerPath, "utf8");

test("runner earnings derives completed and ready-for-payout totals", () => {
  assert.match(
    source,
    /const completedEarnings = completedRuns\.reduce\(/,
    "completed earnings total must derive from completed runs"
  );

  assert.match(
    source,
    /run\.payoutStatus === "ready_for_payout"/,
    "ready-for-payout total must use canonical payout status"
  );
});

test("earnings tab no longer shows checkpoint placeholder copy", () => {
  assert.doesNotMatch(
    source,
    /Earnings details are not available in this checkpoint/,
    "earnings placeholder must be removed"
  );

  assert.match(
    source,
    /Completed earnings/,
    "earnings tab must show completed earnings"
  );

  assert.match(
    source,
    /Ready for payout/,
    "earnings tab must show ready-for-payout amount"
  );
});

test("earnings tab does not claim payout was already sent", () => {
  assert.match(
    source,
    /It does not mean a payout transfer has been sent yet\./,
    "earnings copy must distinguish payout readiness from transfer completion"
  );
});
