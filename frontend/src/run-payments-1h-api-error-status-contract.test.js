import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const clientPath = path.resolve("src", "api", "client.js");
const clientSource = readFileSync(clientPath, "utf8");

test("apiRequest preserves non-OK HTTP status on the thrown error", () => {
  assert.match(
    clientSource,
    /if\s*\(\s*!res\.ok\s*\)/,
    "apiRequest must retain the existing non-OK response guard"
  );

  assert.match(
    clientSource,
    /const\s+error\s*=\s*new\s+Error\(\s*data\?\.(?:error)\s*\|\|\s*["']Request failed["']\s*\)/,
    "apiRequest must construct the HTTP error before throwing it"
  );

  assert.match(
    clientSource,
    /error\.response\s*=\s*\{\s*status:\s*res\.status\s*\}/,
    "apiRequest must preserve response.status for transient-failure classification"
  );

  assert.match(
    clientSource,
    /throw\s+error\s*;/,
    "apiRequest must throw the status-bearing error"
  );
});

test("apiRequest does not add automatic request replay", () => {
  assert.doesNotMatch(
    clientSource,
    /retry|replay/i,
    "transport status preservation must not introduce automatic retry behavior"
  );
});