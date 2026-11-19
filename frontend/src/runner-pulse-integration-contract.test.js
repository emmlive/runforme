import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = readFileSync(
  path.resolve("src", "RunnerDashboard.jsx"),
  "utf8"
);

test("Runner dashboard imports and renders RUNFORME Pulse only outside active runs", () => {
  assert.match(
    source,
    /import\s*\{[\s\S]*RunnerPulseSheet[\s\S]*\}\s*from\s*["']\.\/components\/runner["']/
  );
  assert.match(
    source,
    /<RunnerPulseSheet[\s\S]*open=\{online\s*&&\s*!activeRun\s*&&\s*pulseOpen\}/
  );
});

test("Runner dashboard loads server-driven Pulse eligibility", () => {
  assert.match(
    source,
    /async function fetchPulseEligibility\(\)[\s\S]*apiRequest\(["']\/api\/runners\/pulse["']\)/
  );
  assert.match(source, /const\s+eligible\s*=\s*Boolean\(res\.pulse\?\.eligible\)/);
  assert.match(source, /setPulseOpen\(eligible\)/);
});

test("Runner can explicitly pass with the human-friendly Not this one action", () => {
  assert.ok(source.includes('"Not this one"'));
  assert.match(
    source,
    /apiRequest\(\s*`\/api\/runs\/\$\{runId\}\/pass`[\s\S]*method:\s*["']POST["']/
  );
  assert.match(
    source,
    /setRuns\(\(prev\)\s*=>\s*prev\.filter\(\(r\)\s*=>\s*r\.id\s*!==\s*runId\)\)/
  );
  assert.match(source, /await fetchPulseEligibility\(\)/);
});

test("Pulse response and dismissal post only categorical runner feedback", () => {
  assert.match(
    source,
    /apiRequest\(["']\/api\/runners\/pulse\/response["'][\s\S]*body:\s*\{\s*reason,\s*dismissed:\s*false\s*\}/
  );
  assert.match(
    source,
    /apiRequest\(["']\/api\/runners\/pulse\/response["'][\s\S]*body:\s*\{\s*dismissed:\s*true\s*\}/
  );
});

test("Pulse acknowledgement copy matches the approved better-fit design", () => {
  const expected = [
    "Got it. We’ll keep distance in mind.",
    "Makes sense. Trip value matters.",
    "Got it. Timing’s everything.",
    "Understood. Not every run is your run.",
    "All good. We’ll give you some space.",
    "Thanks. We’ll keep learning what works for you.",
  ];

  for (const message of expected) {
    assert.ok(source.includes(message), `missing acknowledgement: ${message}`);
  }
});

test("done-for-now feedback does not silently force runner offline", () => {
  const ackStart = source.indexOf("const PULSE_ACKNOWLEDGEMENTS");
  assert.notEqual(ackStart, -1);
  const ackSection = source.slice(ackStart, ackStart + 1400);

  assert.doesNotMatch(ackSection, /setOnline\(false\)|toggleOnline\(/);
});


test("self-pass socket acknowledgement remains positive instead of error-styled", () => {
  assert.match(
    source,
    /data\.reason\s*===\s*["']You passed on this run["'][\s\S]{0,220}["']success["'][\s\S]{0,220}["']error["']/
  );
});
