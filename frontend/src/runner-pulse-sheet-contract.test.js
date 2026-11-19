import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = readFileSync(
  path.resolve("src", "components", "runner", "RunnerPulseSheet.jsx"),
  "utf8"
);

test("RUNFORME Pulse uses the approved better-fit framing", () => {
  assert.match(source, /Let[’']s find a better fit\./);
  assert.match(
    source,
    /What would make the next one work better for you\?/
  );
});

test("RUNFORME Pulse exposes all six approved one-tap choices", () => {
  for (const label of [
    "Closer to me",
    "Better value for the trip",
    "Better timing",
    "Different kind of errand",
    "I’m done for now",
    "Something else",
  ]) {
    assert.ok(source.includes(label), `missing Pulse choice: ${label}`);
  }

  for (const value of [
    "closer_to_me",
    "better_value",
    "better_timing",
    "different_errand",
    "done_for_now",
    "something_else",
  ]) {
    assert.ok(source.includes(value), `missing Pulse value: ${value}`);
  }
});

test("RUNFORME Pulse is optional accessible and dismissible", () => {
  assert.match(source, /role=["']dialog["']/);
  assert.match(source, /aria-modal=["']true["']/);
  assert.match(source, /onDismiss/);
  assert.match(source, /Not now/);
});

test("RUNFORME Pulse contains no enforcement framing", () => {
  assert.doesNotMatch(
    source,
    /acceptance rate|ranking|penalty|punish|payout consequence/i
  );
});
