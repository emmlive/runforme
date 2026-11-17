import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const runnerDashboardPath = path.resolve("src", "RunnerDashboard.jsx");
const source = fs.readFileSync(runnerDashboardPath, "utf8");

test("runner online preference is persisted per runner", () => {
  assert.match(
    source,
    /runforme\.runner\.\$\{userId\}\.online/,
    "online persistence key should be namespaced per runner"
  );
  assert.match(
    source,
    /window\.localStorage\.getItem\(runnerOnlineStorageKey\(userId\)\)/,
    "runner dashboard should restore the persisted online preference"
  );
  assert.match(
    source,
    /window\.localStorage\.setItem\([\s\S]*?runnerOnlineStorageKey\(userId\)[\s\S]*?online \? "true" : "false"/,
    "runner dashboard should persist online/offline changes"
  );
});

test("persisted online state is re-synchronized with backend after refresh", () => {
  assert.match(
    source,
    /const persistedOnline = readPersistedRunnerOnline\(user\.id\)/,
    "runner dashboard should read persisted state on user initialization"
  );
  assert.match(
    source,
    /apiRequest\("\/api\/runners\/status",[\s\S]*?method: "POST",[\s\S]*?body: \{ online: true \}/,
    "persisted online state should be announced to the canonical backend status endpoint"
  );
  assert.match(
    source,
    /setOnline\(true\);[\s\S]*?setStatusMessage\(/,
    "restored online state should update the visible runner status"
  );
});

test("manual online toggle persists only after backend status update succeeds", () => {
  const successBlock = source.match(
    /if \(!res\.success\)[\s\S]*?throw new Error\([\s\S]*?\);[\s\S]*?setOnline\(nextOnline\);[\s\S]*?persistRunnerOnline\(user\?\.id, nextOnline\);/
  );
  assert.ok(
    successBlock,
    "manual toggle should persist state only after the backend reports success"
  );
});

test("runner live-payment copy contains no placeholder-era card messaging", () => {
  assert.doesNotMatch(
    source,
    /Placeholder mode does not charge a live card\./,
    "available-runs copy must not claim placeholder payment mode"
  );
  assert.doesNotMatch(
    source,
    /No live card charge in placeholder mode\./,
    "purchase-run copy must not claim placeholder payment mode"
  );
  assert.match(
    source,
    /Only runs with an authorized secure hold appear here\. Payment is handled securely before you accept\./
  );
  assert.match(
    source,
    /The requester’s secure hold was authorized before this offer became available\./
  );
});
