import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const srcDir = path.resolve(process.cwd(), "src");
const appSource = fs.readFileSync(path.join(srcDir, "App.jsx"), "utf8");
const loginSource = fs.readFileSync(path.join(srcDir, "Login.jsx"), "utf8");

test("unauthenticated app exposes a dedicated signup route", () => {
  assert.match(
    appSource,
    /\/signup/,
    "App.jsx must expose /signup"
  );

  assert.match(
    appSource,
    /SignUp/,
    "App.jsx must render a SignUp component"
  );
});

test("login gives users a visible path to signup", () => {
  assert.match(
    loginSource,
    /Sign up/i,
    "Login must show visible Sign up text"
  );

  assert.match(
    loginSource,
    /href=["']\/signup["']/,
    "Login must link to /signup"
  );
});

test("signup component uses the existing registration contract", () => {
  const signupPath = path.join(srcDir, "SignUp.jsx");

  assert.equal(
    fs.existsSync(signupPath),
    true,
    "SignUp.jsx must exist"
  );

  const signupSource = fs.readFileSync(signupPath, "utf8");

  assert.match(
    signupSource,
    /\/api\/auth\/register/,
    "SignUp must call /api/auth/register"
  );

  assert.match(
    signupSource,
    /requester/,
    "SignUp must support requester role"
  );

  assert.match(
    signupSource,
    /runner/,
    "SignUp must support runner role"
  );

  assert.match(
    signupSource,
    /password/i,
    "SignUp must collect a password"
  );

  assert.match(
    signupSource,
    /email/i,
    "SignUp must collect an email"
  );
});
