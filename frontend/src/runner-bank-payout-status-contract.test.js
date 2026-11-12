import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.resolve("src", "RunnerDashboard.jsx"),
  "utf8"
);

test("Earnings fetches canonical payout summary", () => {
  assert.match(
    source,
    /apiRequest\("\/api\/runners\/payouts\/summary"\)/
  );

  assert.match(
    source,
    /setBankPayouts\(/
  );
});

test("Earnings distinguishes transfer completion from bank payout", () => {
  assert.match(
    source,
    /Transferred to Stripe account/
  );

  assert.match(
    source,
    /Bank payout status/
  );

  assert.match(
    source,
    /A transfer can be complete before funds reach your bank\./
  );
});

test("bank payout lifecycle labels are runner-readable", () => {
  for (const label of [
    "Processing at Stripe",
    "On the way to bank",
    "Paid to bank",
    "Payout failed",
  ]) {
    assert.match(
      source,
      new RegExp(label)
    );
  }
});

test("Earnings handles absence of bank payout events without claiming bank payment", () => {
  assert.match(
    source,
    /No bank payout activity has been reported by Stripe yet\./
  );
});
