import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardPath = path.join(here, "Dashboard.jsx");
const paymentPagePath = path.join(here, "pages", "PaymentPage.tsx");

const dashboard = fs.readFileSync(dashboardPath, "utf8");
const paymentPage = fs.readFileSync(paymentPagePath, "utf8");

test("successful run creation immediately starts the Secure Hold authorization flow", () => {
  assert.match(
    dashboard,
    /const\s+createdRun\s*=\s*data\.run/,
    "createRun should retain the newly created canonical run"
  );

  assert.match(
    dashboard,
    /await\s+authorizeSecureHold\(\s*createdRun\.id\s*\)/,
    "createRun should immediately begin Secure Hold authorization for the new run"
  );

  assert.doesNotMatch(
    dashboard,
    /Run created and sent to available runners\./,
    "UI must not claim runner dispatch before Secure Hold authorization"
  );
});

test("Secure Hold payment UI uses the canonical Stripe client-secret confirmation flow", () => {
  assert.match(
    paymentPage,
    /stripe\.confirmCardPayment\(\s*clientSecret/,
    "PaymentPage must confirm the backend-issued clientSecret"
  );

  assert.match(
    paymentPage,
    /status\s*===\s*"requires_capture"/,
    "PaymentPage must only report authorization after Stripe reaches requires_capture"
  );

  assert.match(
    paymentPage,
    /await\s+onAuthorized\(\s*runId\s*\)/,
    "PaymentPage must reconcile canonical backend authorization after provider confirmation"
  );
});

test("Secure Hold UI does not describe the canonical flow as a placeholder", () => {
  assert.doesNotMatch(
    dashboard,
    /safe placeholder endpoint/i,
    "production-facing Secure Hold UI must not describe the canonical endpoint as a placeholder"
  );

  assert.doesNotMatch(
    dashboard,
    /No live charge is made from\s*Secure Hold authorization/i,
    "broken placeholder-era payment copy must be removed"
  );
});