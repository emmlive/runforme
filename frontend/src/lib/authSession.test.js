import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authSessionPath = path.join(__dirname, "authSession.js");
const appPath = path.join(__dirname, "..", "App.jsx");

async function loadAuthSession() {
  return import(pathToFileURL(authSessionPath).href);
}

function createAxiosDouble() {
  let rejectedHandler = null;
  let installedId = 0;
  const ejected = [];

  return {
    interceptors: {
      response: {
        use(_fulfilled, rejected) {
          rejectedHandler = rejected;
          return installedId++;
        },
        eject(id) {
          ejected.push(id);
        },
      },
    },
    getRejectedHandler() {
      return rejectedHandler;
    },
    getEjectedIds() {
      return [...ejected];
    },
  };
}

function createStorageDouble(initialToken = null) {
  let token = initialToken;
  let removeCount = 0;

  return {
    getItem(key) {
      if (key === "token") {
        return token;
      }
      return null;
    },
    removeItem(key) {
      if (key === "token") {
        removeCount += 1;
        token = null;
      }
    },
    getRemoveCount() {
      return removeCount;
    },
    getToken() {
      return token;
    },
  };
}

test("Task 9 auth-session helper exists", () => {
  assert.ok(
    fs.existsSync(authSessionPath),
    "Task 9 RED: frontend/src/lib/authSession.js must exist"
  );
});

test("authenticated 401 clears the stored token exactly once and expires the UI session", async () => {
  if (!fs.existsSync(authSessionPath)) {
    return;
  }

  const { installAuthSession401Handler } = await loadAuthSession();

  assert.equal(
    typeof installAuthSession401Handler,
    "function",
    "authSession.js must export installAuthSession401Handler"
  );

  const axiosInstance = createAxiosDouble();
  const storage = createStorageDouble("stored-session");
  let expiredCount = 0;

  const cleanup = installAuthSession401Handler({
    axiosInstance,
    storage,
    onSessionExpired() {
      expiredCount += 1;
    },
  });

  assert.equal(typeof cleanup, "function");

  const reject = axiosInstance.getRejectedHandler();
  assert.equal(typeof reject, "function");

  const first401 = new Error("unauthorized");
  first401.response = { status: 401 };

  await assert.rejects(
    () => reject(first401),
    /unauthorized/
  );

  assert.equal(storage.getToken(), null);
  assert.equal(storage.getRemoveCount(), 1);
  assert.equal(expiredCount, 1);

  const second401 = new Error("still unauthorized");
  second401.response = { status: 401 };

  await assert.rejects(
    () => reject(second401),
    /still unauthorized/
  );

  assert.equal(
    storage.getRemoveCount(),
    1,
    "a stale session must be cleared exactly once"
  );

  assert.equal(
    expiredCount,
    1,
    "repeated 401s after token removal must not trigger a redirect/session-expiry loop"
  );
});

test("unauthenticated 401 does not clear or redirect auth-page requests", async () => {
  if (!fs.existsSync(authSessionPath)) {
    return;
  }

  const { installAuthSession401Handler } = await loadAuthSession();

  const axiosInstance = createAxiosDouble();
  const storage = createStorageDouble(null);
  let expiredCount = 0;

  installAuthSession401Handler({
    axiosInstance,
    storage,
    onSessionExpired() {
      expiredCount += 1;
    },
  });

  const reject = axiosInstance.getRejectedHandler();

  const error = new Error("login or recovery unauthorized");
  error.response = { status: 401 };

  await assert.rejects(
    () => reject(error),
    /login or recovery unauthorized/
  );

  assert.equal(storage.getRemoveCount(), 0);
  assert.equal(expiredCount, 0);
});

test("non-401 failures never expire an authenticated session", async () => {
  if (!fs.existsSync(authSessionPath)) {
    return;
  }

  const { installAuthSession401Handler } = await loadAuthSession();

  const axiosInstance = createAxiosDouble();
  const storage = createStorageDouble("stored-session");
  let expiredCount = 0;

  installAuthSession401Handler({
    axiosInstance,
    storage,
    onSessionExpired() {
      expiredCount += 1;
    },
  });

  const reject = axiosInstance.getRejectedHandler();

  const error = new Error("server failure");
  error.response = { status: 500 };

  await assert.rejects(
    () => reject(error),
    /server failure/
  );

  assert.equal(storage.getRemoveCount(), 0);
  assert.equal(storage.getToken(), "stored-session");
  assert.equal(expiredCount, 0);
});

test("cleanup ejects the installed Axios response interceptor", async () => {
  if (!fs.existsSync(authSessionPath)) {
    return;
  }

  const { installAuthSession401Handler } = await loadAuthSession();

  const axiosInstance = createAxiosDouble();
  const storage = createStorageDouble("stored-session");

  const cleanup = installAuthSession401Handler({
    axiosInstance,
    storage,
    onSessionExpired() {},
  });

  cleanup();

  assert.deepEqual(
    axiosInstance.getEjectedIds(),
    [0],
    "Task 9 lifecycle cleanup must eject the installed response interceptor"
  );
});

test("App wires the stale-session helper into lifecycle cleanup", () => {
  if (!fs.existsSync(authSessionPath)) {
    return;
  }

  const source = fs.readFileSync(appPath, "utf8");

  assert.match(
    source,
    /installAuthSession401Handler/,
    "App must install the reusable Task 9 Axios stale-session handler"
  );

  assert.match(
    source,
    /useEffect/,
    "Task 9 hookup must be lifecycle-bound"
  );

  assert.match(
    source,
    /return\s+(?:cleanup|uninstall|eject|removeAuthSessionHandler)\b|return\s+installAuthSession401Handler\s*\(/,
    "App lifecycle must return interceptor cleanup/eject behavior"
  );
});