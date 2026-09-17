import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const dashboardPath = path.resolve("src", "Dashboard.jsx");
const dashboardSource = readFileSync(dashboardPath, "utf8");

function getFetchRunsSlice() {
  const startMarker = "const fetchRuns = useCallback(async () => {";
  const endMarker = "}, [token]);";

  const start = dashboardSource.indexOf(startMarker);

  assert.notEqual(
    start,
    -1,
    "Dashboard must retain the canonical requester fetchRuns function"
  );

  const end = dashboardSource.indexOf(endMarker, start);

  assert.notEqual(
    end,
    -1,
    "Dashboard fetchRuns must retain its token dependency boundary"
  );

  return dashboardSource.slice(
    start,
    end + endMarker.length
  );
}

test("requester fetchRuns preserves HTTP status before classification", () => {
  const fetchRuns = getFetchRunsSlice();

  assert.match(
    fetchRuns,
    /fetch\(\s*`\$\{API_URL\}\/api\/runs`/,
    "requester fetchRuns must retain the canonical direct GET /api/runs request"
  );

  assert.match(
    fetchRuns,
    /if\s*\(\s*!response\.ok\s*\|\|\s*data\.success\s*===\s*false\s*\)/,
    "requester fetchRuns must retain its existing response failure guard"
  );

  assert.match(
    fetchRuns,
    /const\s+error\s*=\s*new\s+Error\(\s*data\.error\s*\|\|\s*["']Failed to load runs["']\s*\)/,
    "requester fetchRuns must construct the response failure before throwing it"
  );

  assert.match(
    fetchRuns,
    /error\.response\s*=\s*\{\s*status:\s*response\.status\s*\}/,
    "requester fetchRuns must preserve response.status for the shared classifier"
  );

  assert.match(
    fetchRuns,
    /throw\s+error\s*;/,
    "requester fetchRuns must throw the status-bearing error"
  );

  assert.match(
    fetchRuns,
    /classifyTransientFailure\(err\)/,
    "the status-bearing error must continue into the shared classifier"
  );
});

test("requester status preservation does not add automatic replay", () => {
  const fetchRuns = getFetchRunsSlice();

  assert.doesNotMatch(
    fetchRuns,
    /retry|replay/i,
    "transport status preservation must not add automatic read replay"
  );

  assert.doesNotMatch(
    fetchRuns,
    /method:\s*["']POST["']/,
    "requester fetchRuns must remain read-only"
  );
});