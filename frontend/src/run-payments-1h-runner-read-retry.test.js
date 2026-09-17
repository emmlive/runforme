import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const runnerPath = path.resolve("src", "RunnerDashboard.jsx");
const runnerSource = readFileSync(runnerPath, "utf8");

function getFetchRunsSlice() {
  const startMarker = "async function fetchRuns() {";
  const endMarker = "////////////////////////////////////////////////////////";

  const start = runnerSource.indexOf(startMarker);

  assert.notEqual(
    start,
    -1,
    "RunnerDashboard must retain the canonical fetchRuns read function"
  );

  const end = runnerSource.indexOf(
    endMarker,
    start + startMarker.length
  );

  assert.notEqual(
    end,
    -1,
    "RunnerDashboard fetchRuns must retain its section boundary"
  );

  return runnerSource.slice(start, end);
}

test("runner available-runs thrown failures use the shared safe classifier", () => {
  assert.match(
    runnerSource,
    /import\s*\{\s*classifyTransientFailure\s*\}\s*from\s*["']\.\/lib\/transientFailure\.js["']/,
    "RunnerDashboard must import the shared transient-failure classifier"
  );

  const fetchRuns = getFetchRunsSlice();

  assert.match(
    fetchRuns,
    /apiRequest\(\s*["']\/api\/runs["']\s*\)/,
    "fetchRuns must remain the canonical read-only /api/runs request"
  );

  assert.match(
    fetchRuns,
    /const\s+failure\s*=\s*classifyTransientFailure\(err\)/,
    "runner fetchRuns must classify the caught network or HTTP failure"
  );

  assert.match(
    fetchRuns,
    /setRunsError\(\s*failure\.message\s*\)/,
    "runner fetchRuns must expose only the classifier safe message"
  );

  assert.doesNotMatch(
    fetchRuns,
    /setRunsError\(\s*err\.message/,
    "runner fetchRuns must not expose the raw caught error message"
  );
});

test("runner read retry remains explicit and reuses fetchRuns", () => {
  assert.match(
    runnerSource,
    /className=["']runner-available-runs-panel__retry["'][\s\S]*?onClick=\{fetchRuns\}[\s\S]*?>[\s\S]*?Retry/,
    "available-runs failure UI must retain the explicit Retry action"
  );

  assert.match(
    runnerSource,
    /disabled=\{runsLoading\}/,
    "Retry must remain disabled while the read is already loading"
  );
});

test("runner mutation paths remain separate from read retry", () => {
  const postMatches =
    runnerSource.match(/method:\s*["']POST["']/g) || [];

  assert.equal(
    postMatches.length,
    7,
    "the existing seven runner POST mutation call sites must remain unchanged"
  );

  const fetchRuns = getFetchRunsSlice();

  assert.doesNotMatch(
    fetchRuns,
    /method:\s*["']POST["']/,
    "runner fetchRuns must remain read-only"
  );

  assert.doesNotMatch(
    fetchRuns,
    /retry|replay/i,
    "fetchRuns must not automatically replay a failed request"
  );
});
test("runner logical application failures use safe generic API copy", () => {
  const fetchRuns = getFetchRunsSlice();

  assert.match(
    fetchRuns,
    /else\s*\{\s*setRunsError\(\s*["']Something went wrong\.["']\s*\)\s*;/,
    "runner success:false application failures must use the safe generic API message"
  );

  assert.doesNotMatch(
    fetchRuns,
    /setRunsError\(\s*res\.error/,
    "runner success:false application failures must not expose raw backend error text"
  );
});