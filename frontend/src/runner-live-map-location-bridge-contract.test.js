import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const runnerPath = path.resolve("src", "RunnerDashboard.jsx");
const source = readFileSync(runnerPath, "utf8");

test("runner keeps active GPS coordinates in local UI state", () => {
  assert.match(
    source,
    /const\s+\[runnerLocation,\s*setRunnerLocation\]\s*=\s*useState\(null\)/
  );
  assert.match(
    source,
    /setRunnerLocation\(\{\s*lat:\s*pos\.coords\.latitude,\s*lng:\s*pos\.coords\.longitude,?\s*\}\)/
  );
});

test("runner passes active GPS coordinates into LiveMap without backend schema changes", () => {
  assert.match(
    source,
    /<LiveMap\s+run=\{activeRun\}\s+runnerLocation=\{runnerLocation\}\s*\/>/
  );
  assert.doesNotMatch(
    source,
    /geocode|Geocoder/i,
    "RUN-MAPS-1A must not add browser geocoding"
  );
});
