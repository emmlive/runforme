import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appPath = path.join(__dirname, "App.jsx");
const resetPath = path.join(__dirname, "ResetPassword.jsx");

const INVALID_LINK_COPY = "Invalid or expired reset link";
const SUCCESS_COPY =
  "Password reset successfully. Please sign in again.";
const PASSWORD_GUIDANCE =
  "Password must be between 12 and 128 characters.";

function read(pathname) {
  return fs.readFileSync(pathname, "utf8");
}

function readResetPassword() {
  assert.ok(
    fs.existsSync(resetPath),
    "ResetPassword.jsx must exist"
  );

  return read(resetPath);
}

test("ResetPassword screen exists", () => {
  assert.ok(
    fs.existsSync(resetPath),
    "ResetPassword.jsx must exist"
  );
});

test("ResetPassword reads raw token only from window.location.search", () => {
  const source = readResetPassword();

  assert.ok(
    source.includes("window.location.search"),
    "ResetPassword must read the reset token from window.location.search"
  );

  assert.ok(
    source.includes("URLSearchParams"),
    "ResetPassword must parse the query string with URLSearchParams"
  );

  assert.ok(
    source.includes('get("token")') ||
      source.includes("get('token')"),
    "ResetPassword must read the token query parameter"
  );
});

test("missing reset token shows the generic invalid-link response", () => {
  const source = readResetPassword();

  assert.ok(
    source.includes(INVALID_LINK_COPY),
    "Missing token handling must use the generic invalid-link copy"
  );

  const tokenReadIndex = Math.max(
    source.indexOf('get("token")'),
    source.indexOf("get('token')")
  );
  const postIndex = source.indexOf("/api/auth/reset-password");

  assert.notEqual(tokenReadIndex, -1);
  assert.notEqual(postIndex, -1);

  assert.ok(
    tokenReadIndex < postIndex,
    "Token validation must occur before reset submission"
  );
});

test("ResetPassword provides new-password and confirmation fields", () => {
  const source = readResetPassword();

  assert.ok(
    source.includes("newPassword"),
    "ResetPassword must track the new password"
  );

  assert.ok(
    source.includes("confirmPassword"),
    "ResetPassword must track password confirmation"
  );

  assert.ok(
    source.includes('type="password"'),
    "ResetPassword password fields must use password inputs"
  );
});

test("ResetPassword enforces the shared 12 through 128 character guidance", () => {
  const source = readResetPassword();

  assert.ok(
    source.includes(PASSWORD_GUIDANCE),
    "ResetPassword must mirror the canonical password-length guidance"
  );

  assert.ok(
    source.includes("12"),
    "ResetPassword must enforce the 12-character minimum"
  );

  assert.ok(
    source.includes("128"),
    "ResetPassword must enforce the 128-character maximum"
  );
});

test("ResetPassword rejects password confirmation mismatch before submit", () => {
  const source = readResetPassword();

  assert.ok(
    source.includes("newPassword !== confirmPassword") ||
      source.includes("confirmPassword !== newPassword"),
    "ResetPassword must compare the two password fields"
  );

  assert.ok(
    source.toLowerCase().includes("passwords do not match"),
    "ResetPassword must show a mismatch message"
  );

  const mismatchIndex = Math.max(
    source.indexOf("newPassword !== confirmPassword"),
    source.indexOf("confirmPassword !== newPassword")
  );
  const postIndex = source.indexOf("/api/auth/reset-password");

  assert.notEqual(mismatchIndex, -1);
  assert.notEqual(postIndex, -1);

  assert.ok(
    mismatchIndex < postIndex,
    "Password confirmation must be checked before reset submission"
  );
});

test("ResetPassword uses the existing VITE_API_URL pattern", () => {
  const source = readResetPassword();

  assert.ok(
    source.includes("import.meta.env.VITE_API_URL"),
    "ResetPassword must use VITE_API_URL"
  );

  assert.ok(
    source.includes("http://localhost:5050"),
    "ResetPassword must preserve the local API fallback"
  );
});

test("ResetPassword posts only token and newPassword to the canonical endpoint", () => {
  const source = readResetPassword();

  assert.ok(
    source.includes("/api/auth/reset-password"),
    "ResetPassword must call /api/auth/reset-password"
  );

  assert.match(
    source,
    /\{\s*token\s*,\s*newPassword\s*,?\s*\}/,
    "ResetPassword payload must contain token and newPassword"
  );

  assert.equal(
    source.includes("{ token, newPassword, confirmPassword }"),
    false,
    "Confirmation must not be sent to the backend"
  );
});

test("invalid expired or consumed reset failures use generic invalid-link copy", () => {
  const source = readResetPassword();

  assert.ok(
    source.includes(INVALID_LINK_COPY),
    "ResetPassword must use the approved generic invalid-link copy"
  );

  const forbiddenSignals = [
    "token not found",
    "token expired",
    "token consumed",
    "token revoked",
    "already used token",
  ];

  const lower = source.toLowerCase();

  for (const signal of forbiddenSignals) {
    assert.equal(
      lower.includes(signal),
      false,
      `ResetPassword must not disclose token state: ${signal}`
    );
  }
});

test("successful reset shows canonical success copy and returns user to login", () => {
  const source = readResetPassword();

  assert.ok(
    source.includes(SUCCESS_COPY),
    "ResetPassword must show the canonical successful-reset copy"
  );

  assert.ok(
    source.includes('href="/"') ||
      source.includes("href='/'") ||
      source.includes('window.location.href = "/"') ||
      source.includes("window.location.href = '/'"),
    "Successful reset flow must provide navigation back to Login"
  );
});

test("ResetPassword never persists or logs raw reset token material", () => {
  const source = readResetPassword();

  assert.equal(source.includes("localStorage.setItem"), false);
  assert.equal(source.includes("sessionStorage.setItem"), false);

  assert.equal(
    /console\.(log|info|warn|error|debug)\s*\([^)]*token/i.test(source),
    false,
    "ResetPassword must never write token material to console"
  );
});

test("/reset-password renders before loading and authenticated shell selection", () => {
  const source = read(appPath);

  assert.ok(
    source.includes('import ResetPassword from "./ResetPassword"'),
    "App must import ResetPassword"
  );

  const resetPathIndex = source.indexOf("/reset-password");
  const loadingIndex = source.indexOf("if (loading)");
  const loginIndex = source.indexOf("return <Login");

  assert.notEqual(
    resetPathIndex,
    -1,
    "App must inspect /reset-password"
  );

  assert.notEqual(
    loadingIndex,
    -1,
    "App must preserve its loading state"
  );

  assert.notEqual(
    loginIndex,
    -1,
    "App must preserve Login selection"
  );

  assert.ok(
    resetPathIndex < loadingIndex,
    "Reset Password pathname handling must occur before loading shell selection"
  );

  assert.ok(
    resetPathIndex < loginIndex,
    "Reset Password pathname handling must occur before authenticated shell selection"
  );

  assert.ok(
    source.includes("<ResetPassword"),
    "App must render ResetPassword for the reset pathname"
  );
});

test("Task 8 introduces no router dependency or client token persistence", () => {
  const appSource = read(appPath);
  const resetSource = fs.existsSync(resetPath)
    ? read(resetPath)
    : "";

  assert.equal(appSource.includes("BrowserRouter"), false);
  assert.equal(appSource.includes("createBrowserRouter"), false);
  assert.equal(resetSource.includes("BrowserRouter"), false);
  assert.equal(resetSource.includes("createBrowserRouter"), false);

  assert.equal(resetSource.includes("localStorage.setItem"), false);
  assert.equal(resetSource.includes("sessionStorage.setItem"), false);
});
