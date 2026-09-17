import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loginPath = path.join(__dirname, "Login.jsx");
const appPath = path.join(__dirname, "App.jsx");
const forgotPath = path.join(__dirname, "ForgotPassword.jsx");

const NEUTRAL_COPY =
  "If an account exists for that email and recovery is available, instructions will be sent.";

function read(pathname) {
  return fs.readFileSync(pathname, "utf8");
}

function readForgotPassword() {
  assert.ok(
    fs.existsSync(forgotPath),
    "ForgotPassword.jsx must exist"
  );

  return read(forgotPath);
}

test("Login exposes Forgot password navigation", () => {
  const source = read(loginPath);

  assert.ok(
    source.includes("Forgot password?"),
    "Login must show Forgot password?"
  );

  assert.ok(
    source.includes('"/forgot-password"') ||
      source.includes("'/forgot-password'"),
    "Login must navigate to /forgot-password"
  );
});

test("ForgotPassword screen exists", () => {
  assert.ok(
    fs.existsSync(forgotPath),
    "ForgotPassword.jsx must exist"
  );
});

test("ForgotPassword uses existing VITE_API_URL pattern", () => {
  const source = readForgotPassword();

  assert.ok(
    source.includes("import.meta.env.VITE_API_URL"),
    "ForgotPassword must use VITE_API_URL"
  );

  assert.ok(
    source.includes("http://localhost:5050"),
    "ForgotPassword must preserve the local API fallback pattern"
  );
});

test("ForgotPassword posts only email to the forgot-password endpoint", () => {
  const source = readForgotPassword();

  assert.ok(
    source.includes("/api/auth/forgot-password"),
    "ForgotPassword must call /api/auth/forgot-password"
  );

  assert.ok(
    source.includes("{ email }"),
    "ForgotPassword request payload must contain only email"
  );

  assert.equal(source.includes("password,"), false);
  assert.equal(source.includes("role,"), false);
  assert.equal(source.includes("token,"), false);
  assert.equal(source.includes("newPassword"), false);
});

test("ForgotPassword displays the exact neutral completion copy", () => {
  const source = readForgotPassword();

  assert.ok(
    source.includes(NEUTRAL_COPY),
    "ForgotPassword must display the approved neutral response copy"
  );
});

test("ForgotPassword exposes no account-existence UI signal", () => {
  const source = readForgotPassword().toLowerCase();

  const forbiddenUiSignals = [
    "account found",
    "account not found",
    "user found",
    "user not found",
    "email exists",
    "email does not exist",
    "no account exists",
    "unknown email",
  ];

  for (const signal of forbiddenUiSignals) {
    assert.equal(
      source.includes(signal),
      false,
      `ForgotPassword must not expose account existence: ${signal}`
    );
  }
});

test("ForgotPassword never persists reset or auth token material", () => {
  const source = readForgotPassword();

  assert.equal(source.includes("localStorage.setItem"), false);
  assert.equal(source.includes("sessionStorage.setItem"), false);
  assert.equal(source.includes('setItem("token"'), false);
  assert.equal(source.includes("setItem('token'"), false);
});

test("/forgot-password pathname renders before authenticated shell selection", () => {
  const source = read(appPath);

  assert.ok(
    source.includes('import ForgotPassword from "./ForgotPassword"'),
    "App must import ForgotPassword"
  );

  const forgotPathIndex = source.indexOf("/forgot-password");
  const loginSelectionIndex = source.indexOf("return <Login");

  assert.notEqual(
    forgotPathIndex,
    -1,
    "App must inspect /forgot-password"
  );

  assert.notEqual(
    loginSelectionIndex,
    -1,
    "App must preserve unauthenticated Login selection"
  );

  assert.ok(
    forgotPathIndex < loginSelectionIndex,
    "Forgot Password pathname handling must occur before Login/auth shell selection"
  );

  assert.ok(
    source.includes("<ForgotPassword"),
    "App must render ForgotPassword for its pathname"
  );
});

test("Task 7 does not require a new router dependency", () => {
  const appSource = read(appPath);
  const forgotSource = fs.existsSync(forgotPath)
    ? read(forgotPath)
    : "";

  assert.equal(appSource.includes("BrowserRouter"), false);
  assert.equal(appSource.includes("createBrowserRouter"), false);
  assert.equal(forgotSource.includes("BrowserRouter"), false);
  assert.equal(forgotSource.includes("createBrowserRouter"), false);
});
