import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve("src");
const dashboard = readFileSync(path.join(root, "Dashboard.jsx"), "utf8");
const mobile = readFileSync(
  path.join(root, "components/requester/RequesterMobileShell.jsx"),
  "utf8"
);
const runList = readFileSync(
  path.join(root, "components/requester/RequesterRunList.jsx"),
  "utf8"
);
const runLists = readFileSync(
  path.join(root, "components/requester/RequesterRunLists.jsx"),
  "utf8"
);

test("requester purchase review uses one customer-facing action label", () => {
  assert.doesNotMatch(mobile, /Approve manual review/);
  assert.doesNotMatch(dashboard, /Approve Manual Review/);
  assert.match(mobile, /Approve purchase/);
  assert.match(dashboard, /Approve purchase/);
});

test("requester detail labels avoid internal manual-review terminology", () => {
  assert.doesNotMatch(dashboard, /["Manual Review",/);
  assert.doesNotMatch(mobile, /["Manual review",/);
  assert.match(dashboard, /["Purchase Review",/);
  assert.match(mobile, /["Purchase review",/);
});

test("wide requester run list maps raw run states to friendly labels", () => {
  assert.match(runList, /const statusLabels = {/);
  assert.match(runList, /open:s*"Requested"/);
  assert.match(runList, /assigned:s*"Runner assigned"/);
  assert.match(runList, /in_progress:s*"In progress"/);
  assert.match(runList, /completed:s*"Completed"/);
  assert.match(
    runList,
    /return statusLabels[status] || status || "Ready"/
  );
});

test("desktop history copy matches completed-run semantics", () => {
  assert.match(runLists, /title="Completed"/);
  assert.match(
    runLists,
    /emptyMessage="Completed runs will appear here."/
  );
  assert.doesNotMatch(runLists, /Completed requester runs/);
});
