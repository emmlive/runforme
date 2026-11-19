import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const liveMapPath = path.resolve("src", "components", "LiveMap.jsx");
const source = readFileSync(liveMapPath, "utf8");

test("LiveMap exposes readable acquiring and permission-denied guidance", () => {
  assert.match(source, /locationStatus\s*===\s*["']acquiring["']/);
  assert.match(source, /Getting your live location/);
  assert.match(source, /locationStatus\s*===\s*["']denied["']/);
  assert.match(source, /Allow location access/);
});

test("LiveMap exposes unavailable timeout and generic failure guidance", () => {
  assert.match(source, /locationStatus\s*===\s*["']unavailable["']/);
  assert.match(source, /could not provide a live location/);
  assert.match(source, /locationStatus\s*===\s*["']timeout["']/);
  assert.match(source, /timed out/);
  assert.match(source, /locationStatus\s*===\s*["']failed["']/);
  assert.match(source, /could not start live location/);
});

test("LiveMap does not claim readiness without coordinates", () => {
  assert.match(
    source,
    /locationStatus\s*===\s*["']ready["']\s*&&\s*coordinates/
  );
});


test("LiveMap hides a previously ready map when coordinates disappear", () => {
  assert.match(
    source,
    /if\s*\(!googleMapsExplicitlyEnabled\s*\|\|\s*!googleMapsKey\s*\|\|\s*!coordinates\)\s*\{\s*setMapReady\(false\);\s*return;\s*\}/
  );
});
