import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const srcRoot = path.dirname(currentFile);

function read(relativePath) {
  return fs.readFileSync(
    path.join(srcRoot, relativePath),
    "utf8"
  );
}

const appSource = read("App.jsx");
const dashboardSource = read("Dashboard.jsx");
const paymentPageSource = read("pages/PaymentPage.tsx");
const mobileShellSource = read(
  "components/requester/RequesterMobileShell.jsx"
);

test("App contains no competing /api/payments create-intent flow", () => {
  assert.doesNotMatch(
    appSource,
    /\/api\/payments\/create-intent/
  );

  assert.doesNotMatch(
    appSource,
    /\bstartPayment\b/
  );

  assert.doesNotMatch(
    appSource,
    /\bonStartPayment\s*=/
  );
});

test("App no longer owns an independent payment-screen state machine", () => {
  assert.doesNotMatch(
    appSource,
    /const\s*\[\s*showPayment\s*,/
  );

  assert.doesNotMatch(
    appSource,
    /const\s*\[\s*clientSecret\s*,/
  );

  assert.doesNotMatch(
    appSource,
    /const\s*\[\s*activeRunId\s*,/
  );
});

test("Dashboard uses the canonical Secure Hold endpoint", () => {
  assert.match(
    dashboardSource,
    /\/api\/runs\/\$\{runId\}\/authorize-hold/
  );

  assert.doesNotMatch(
    dashboardSource,
    /\/api\/payments\//
  );
});

test("Dashboard handles clientSecret as card-confirmation-required state", () => {
  assert.match(
    dashboardSource,
    /\bclientSecret\b/
  );

  assert.match(
    dashboardSource,
    /PaymentPage/
  );

  assert.match(
    dashboardSource,
    /onAuthorized/
  );
});

test("Dashboard does not report authorization success merely because first authorize-hold returned", () => {
  assert.doesNotMatch(
    dashboardSource,
    /Secure hold placeholder authorized/
  );

  assert.doesNotMatch(
    dashboardSource,
    /No live charge was made/
  );

  assert.doesNotMatch(
    dashboardSource,
    /placeholder authorized/i
  );
});

test("PaymentPage exposes the canonical authorization callback contract", () => {
  assert.match(
    paymentPageSource,
    /onAuthorized\s*:\s*\(\s*runId\s*:\s*number\s*\)/
  );

  assert.match(
    paymentPageSource,
    /onCancel\?\s*:\s*\(\s*\)\s*=>\s*void/
  );
});

test("PaymentPage calls onAuthorized(runId) only after requires_capture", () => {
  const statusIndex = paymentPageSource.indexOf(
    'result.paymentIntent?.status === "requires_capture"'
  );

  assert.notEqual(
    statusIndex,
    -1,
    "requires_capture success branch must remain present"
  );

  const callbackIndex = paymentPageSource.indexOf(
    "onAuthorized(runId)",
    statusIndex
  );

  assert.notEqual(
    callbackIndex,
    -1,
    "onAuthorized(runId) must be called after requires_capture"
  );

  assert.ok(
    callbackIndex > statusIndex,
    "authorization callback must follow requires_capture verification"
  );
});

test("PaymentPage never calls a legacy mark-authorized endpoint", () => {
  assert.doesNotMatch(
    paymentPageSource,
    /\/api\/payments\/mark-authorized/
  );

  assert.doesNotMatch(
    paymentPageSource,
    /mark-authorized/
  );
});

test("PaymentPage keeps raw card handling inside Stripe Elements", () => {
  assert.match(
    paymentPageSource,
    /CardElement/
  );

  assert.match(
    paymentPageSource,
    /confirmCardPayment\s*\(/
  );

  assert.doesNotMatch(
    paymentPageSource,
    /JSON\.stringify\s*\(\s*\{[^}]*card/si
  );
});

test("placeholder-specific Secure Hold copy is absent from requester surfaces", () => {
  const requesterSource = [
    dashboardSource,
    mobileShellSource,
  ].join("\n");

  assert.doesNotMatch(
    requesterSource,
    /Secure hold placeholder/i
  );

  assert.doesNotMatch(
    requesterSource,
    /placeholder mode/i
  );

  assert.doesNotMatch(
    requesterSource,
    /PaymentIntent wiring will be added later/i
  );
});

test("canonical authorized state is represented in requester Secure Hold logic", () => {
  assert.match(
    dashboardSource,
    /authorizationStatus/
  );

  assert.match(
    dashboardSource,
    /["']authorized["']/
  );
});
test("Dashboard reconciles the same Secure Hold after card confirmation", () => {
  assert.match(
    dashboardSource,
    /const\s+reconcileSecureHold\s*=\s*async\s*\(\s*runId\s*\)/
  );

  const reconcileStart = dashboardSource.indexOf(
    "const reconcileSecureHold = async (runId)"
  );

  assert.notEqual(
    reconcileStart,
    -1,
    "Dashboard must define a post-card reconciliation callback"
  );

  const reconcileTail = dashboardSource.slice(
    reconcileStart,
    reconcileStart + 5000
  );

  assert.match(
    reconcileTail,
    /fetch\s*\(\s*`\$\{API_URL\}\/api\/runs\/\$\{runId\}\/authorize-hold`/
  );

  assert.match(
    reconcileTail,
    /authorizationStatus\s*===\s*["']authorized["']/
  );

  assert.match(
    dashboardSource,
    /<PaymentPage[\s\S]*onAuthorized=\{reconcileSecureHold\}/
  );
});

test("Dashboard keeps client confirmation pending until canonical reconciliation", () => {
  assert.match(
    dashboardSource,
    /setSecureHoldConfirmation\s*\(\s*\{[\s\S]*runId[\s\S]*clientSecret/
  );

  assert.match(
    dashboardSource,
    /clientSecret/
  );

  assert.match(
    dashboardSource,
    /authorizationStatus\s*===\s*["']authorized["']/
  );
});