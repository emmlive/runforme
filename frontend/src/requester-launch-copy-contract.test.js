import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve("src");
const sources = [
  "Dashboard.jsx",
  "components/requester/RequesterMissionSummary.jsx",
  "components/requester/RequesterRunOverviewIntro.jsx",
  "components/requester/RequesterTrustTimeline.jsx",
  "components/requester/RequesterMobileShell.jsx",
].map((file) => readFileSync(path.join(root, file), "utf8")).join("\n");

test("requester launch copy removes internal implementation language", () => {
  for (const phrase of [
    "command surface",
    "data-neutral",
    "Flow preserved",
    "Secure hold placeholder",
    "reflected from the active run",
    "Live requester run data",
    "current status is updated from your requester dashboard",
  ]) {
    assert.ok(
      !sources.toLowerCase().includes(phrase.toLowerCase()),
      `requester copy must not expose internal phrase: ${phrase}`
    );
  }
});

test("requester overview uses customer-facing launch language", () => {
  assert.ok(sources.includes("Your requests, in one place."));
  assert.ok(
    sources.includes(
      "Track active runs, funding protection, delivery proof, and completed history."
    )
  );
  assert.ok(sources.includes("Your run at a glance."));
  assert.ok(sources.includes("Track each step from request to completion."));
});

test("Secure Hold copy preserves authorization-vs-capture distinction", () => {
  assert.ok(
    sources.includes(
      "Authorize the estimated amount so a runner can accept the request."
    )
  );
  assert.ok(
    sources.includes(
      "You’ll only be charged according to the completed run, up to the amount you approved."
    )
  );
  assert.match(sources, /Authorize Secure Hold/);
});

test("manual review presentation is customer-centered", () => {
  assert.ok(sources.includes("Review purchase"));
  assert.ok(sources.includes("Your review is needed"));
  assert.ok(sources.includes("Approve purchase"));
  assert.ok(
    sources.includes(
      "Check the receipt and final amount before the run is completed."
    )
  );
});
