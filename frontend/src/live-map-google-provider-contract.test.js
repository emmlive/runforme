import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const liveMapPath = path.resolve("src", "components", "LiveMap.jsx");
const source = readFileSync(liveMapPath, "utf8");

test("LiveMap keeps explicit Google Maps enablement and browser-key guards", () => {
  assert.match(source, /VITE_GOOGLE_MAPS_API_KEY/);
  assert.match(source, /VITE_ENABLE_GOOGLE_MAPS\s*===\s*["']true["']/);
  assert.match(
    source,
    /googleMapsExplicitlyEnabled\s*&&\s*googleMapsKey/,
    "provider path must require both the explicit flag and a key"
  );
});

test("LiveMap validates finite in-range coordinates before provider initialization", () => {
  assert.match(source, /Number\.isFinite/);
  assert.match(source, /lat\s*>=\s*-90/);
  assert.match(source, /lat\s*<=\s*90/);
  assert.match(source, /lng\s*>=\s*-180/);
  assert.match(source, /lng\s*<=\s*180/);
  assert.match(
    source,
    /if\s*\(!googleMapsExplicitlyEnabled\s*\|\|\s*!googleMapsKey\s*\|\|\s*!hasCoordinates\)\s*\{[\s\S]*?return;[\s\S]*?\}/,
    "missing config or coordinates must exit before provider loading"
  );
});

test("configured LiveMap loads the provider and mounts one map plus marker", () => {
  assert.match(
    source,
    /import\s*\{\s*loadGoogleMaps\s*\}\s*from\s*["']\.\.\/lib\/googleMapsLoader\.js["']/
  );
  assert.match(source, /loadGoogleMaps\(\{\s*apiKey:\s*googleMapsKey\s*\}\)/);
  assert.match(source, /new\s+maps\.Map\(/);
  assert.match(source, /new\s+maps\.Marker\(/);
  assert.match(source, /className=["']run-live-google-map["']/);
});

test("provider failure preserves the fallback rather than rendering a blank map", () => {
  assert.match(source, /setMapReady\(false\)/);
  assert.match(source, /catch\(\(err\)\s*=>/);
  assert.match(source, /Map fallback active/);
  assert.match(source, /run-live-map-fallback/);
});

test("LiveMap never renders the raw browser API key", () => {
  assert.doesNotMatch(
    source,
    /\{\s*googleMapsKey\s*\}/,
    "the browser key must be consumed by the loader, not rendered into UI"
  );
});


test("LiveMap reuses the existing map and marker across GPS updates", () => {
  assert.match(source, /const\s+mapInstanceRef\s*=\s*useRef\(null\)/);
  assert.match(source, /const\s+markerRef\s*=\s*useRef\(null\)/);
  assert.match(source, /mapInstanceRef\.current\.setCenter\(mapCoordinates\)/);
  assert.match(source, /markerRef\.current\.setPosition\(mapCoordinates\)/);
});
