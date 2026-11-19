const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = readFileSync(
  path.resolve("src", "routes", "runs.js"),
  "utf8"
);

test("runs route wires explicit runner Pass through the Pulse-aware pass service", () => {
  assert.match(
    source,
    /createRunnerPulseService.*require\(["']\.\.\/services\/runnerPulseService["']\)/s
  );
  assert.match(
    source,
    /createRunnerOfferPassService.*require\(["']\.\.\/services\/runnerOfferPassService["']\)/s
  );
  assert.match(
    source,
    /router\.post\(["']\/:runId\/pass["'],\s*auth,\s*async\s*\(req,\s*res\)/
  );
  assert.match(
    source,
    /runnerOfferPassService\.passRunnerOffer\(\{\s*runnerId:\s*req\.user\.id,\s*runId,?\s*\}\)/
  );
  assert.match(source, /data:\s*\{\s*status:\s*["']passed["']\s*\}/);
});

test("accepting a run resets Pulse misses without making acceptance depend on Pulse", () => {
  assert.match(
    source,
    /pulseService\.resetPulseMisses\(\{\s*runnerId\s*\}\)/
  );
  assert.match(
    source,
    /catch\s*\(pulseError\)[\s\S]{0,300}Pulse reset failed/
  );
});

test("another runner winning remains neutral and is not recorded as a Pulse miss", () => {
  const unavailableSectionStart = source.indexOf("rejectedOffers.forEach");
  assert.notEqual(unavailableSectionStart, -1);

  const unavailableSection = source.slice(
    unavailableSectionStart,
    unavailableSectionStart + 900
  );

  assert.doesNotMatch(
    unavailableSection,
    /recordNonAcceptedOffer|passRunnerOffer/
  );
});
