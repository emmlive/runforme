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
    "Dashboard must retain the canonical fetchRuns requester read function"
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

test("requester read failures use the shared safe transient-failure classifier", () => {
  assert.match(
    dashboardSource,
    /import\s*\{\s*classifyTransientFailure\s*\}\s*from\s*["']\.\/lib\/transientFailure\.js["']/,
    "Dashboard must import the shared transient-failure classifier"
  );

  const fetchRuns = getFetchRunsSlice();

  assert.match(
    fetchRuns,
    /fetch\(\s*`\$\{API_URL\}\/api\/runs`/,
    "fetchRuns must remain the canonical read-only GET /api/runs path"
  );

  assert.match(
    fetchRuns,
    /const\s+failure\s*=\s*classifyTransientFailure\(err\)/,
    "fetchRuns must classify the caught read failure"
  );

  assert.match(
    fetchRuns,
    /showError\(\s*failure\.message\s*\)/,
    "fetchRuns must show only the classifier safe message"
  );

  assert.doesNotMatch(
    fetchRuns,
    /showError\(\s*err\.message/,
    "fetchRuns must not expose the raw caught error message"
  );
});

test("requester read retry remains explicit and reuses fetchRuns", () => {
  assert.match(
    dashboardSource,
    /onClick=\{fetchRuns\}/,
    "desktop requester refresh must explicitly retry through fetchRuns"
  );

  assert.match(
    dashboardSource,
    /onRefresh=\{fetchRuns\}/,
    "mobile requester refresh must explicitly retry through fetchRuns"
  );

  assert.match(
    dashboardSource,
    /setInterval\(fetchRuns,\s*8000\)/,
    "existing polling behavior must remain unchanged"
  );
});

test("requester mutation call sites are not converted into automatic retries", () => {
  const postMatches =
    dashboardSource.match(/method:\s*["']POST["']/g) || [];

  assert.equal(
    postMatches.length,
    4,
    "the existing four requester POST mutation call sites must remain unchanged"
  );

  const fetchRuns = getFetchRunsSlice();

  assert.doesNotMatch(
    fetchRuns,
    /method:\s*["']POST["']/,
    "fetchRuns must remain read-only"
  );
});