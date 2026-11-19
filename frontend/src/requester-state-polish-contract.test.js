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
  assert.ok(!mobile.includes("Approve manual review"));
  assert.ok(!dashboard.includes("Approve Manual Review"));
  assert.ok(mobile.includes("Approve purchase"));
  assert.ok(dashboard.includes("Approve purchase"));
});

test("requester detail labels avoid internal manual-review terminology", () => {
  assert.ok(!dashboard.includes('["Manual Review",'));
  assert.ok(!mobile.includes('["Manual review",'));
  assert.ok(dashboard.includes('["Purchase Review",'));
  assert.ok(mobile.includes('["Purchase review",'));
});

test("wide requester run list maps raw run states to friendly labels", () => {
  assert.ok(runList.includes("const statusLabels = {"));
  assert.ok(runList.includes('open: "Requested"'));
  assert.ok(runList.includes('assigned: "Runner assigned"'));
  assert.ok(runList.includes('in_progress: "In progress"'));
  assert.ok(runList.includes('completed: "Completed"'));
  assert.ok(
    runList.includes('return statusLabels[status] || status || "Ready"')
  );
});

test("desktop history copy matches completed-run semantics", () => {
  assert.ok(runLists.includes('title="Completed"'));
  assert.ok(
    runLists.includes('emptyMessage="Completed runs will appear here."')
  );
  assert.ok(!runLists.includes("Completed requester runs"));
});
