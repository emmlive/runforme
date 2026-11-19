import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const runnerPath = path.resolve("src", "RunnerDashboard.jsx");
const source = readFileSync(runnerPath, "utf8");

test("runner tracks explicit live-location lifecycle state", () => {
  assert.match(
    source,
    /const\s+\[runnerLocationStatus,\s*setRunnerLocationStatus\]\s*=\s*useState\(["']idle["']\)/
  );
  assert.match(source, /setRunnerLocationStatus\(["']acquiring["']\)/);
  assert.match(source, /setRunnerLocationStatus\(["']ready["']\)/);
});

test("runner classifies geolocation permission and device failures", () => {
  assert.match(source, /error\.code\s*===\s*error\.PERMISSION_DENIED/);
  assert.match(source, /setRunnerLocationStatus\(["']denied["']\)/);
  assert.match(source, /error\.code\s*===\s*error\.POSITION_UNAVAILABLE/);
  assert.match(source, /setRunnerLocationStatus\(["']unavailable["']\)/);
  assert.match(source, /error\.code\s*===\s*error\.TIMEOUT/);
  assert.match(source, /setRunnerLocationStatus\(["']timeout["']\)/);
  assert.match(source, /setRunnerLocationStatus\(["']failed["']\)/);
});

test("stopping GPS clears stale live coordinates and resets lifecycle", () => {
  const start = source.indexOf("function stopGpsStreaming()");
  assert.notEqual(start, -1);

  const slice = source.slice(start, start + 900);
  assert.match(slice, /setRunnerLocation\(null\)/);
  assert.match(slice, /setRunnerLocationStatus\(["']idle["']\)/);
});

test("runner keeps one watcher and passes location lifecycle into LiveMap", () => {
  assert.match(
    source,
    /if\s*\(watchIdRef\.current\s*!==\s*null\)\s*return/
  );
  assert.match(
    source,
    /<LiveMap\s+run=\{activeRun\}\s+runnerLocation=\{runnerLocation\}\s+locationStatus=\{runnerLocationStatus\}\s*\/>/
  );
});


test("runner cleans up GPS watcher when dashboard unmounts", () => {
  assert.match(
    source,
    /useEffect\(\(\)\s*=>\s*\{\s*return\s*\(\)\s*=>\s*stopGpsStreaming\(\);\s*\},\s*\[\]\s*\)/
  );
});
