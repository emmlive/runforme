# RUN-PAYMENTS-1A Canonical Secure Hold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Secure Hold placeholder with one provider-backed, manual-capture Stripe authorization flow while preserving RUNFORME lifecycle, privacy, dispatch, receipt, delivery, Smart Handoff, and mobile behavior.

**Architecture:** Keep `POST /api/runs/:runId/authorize-hold` as the sole Secure Hold business boundary. Introduce small provider-isolated backend services with dependency injection, use the existing Prisma `Run` and `StripeWebhookEvent` models, require successful capture before payout readiness, and consolidate the frontend around the existing Secure Hold action rather than `/api/payments/create-intent`.

**Tech Stack:** Node.js, CommonJS backend, Express, Prisma, Stripe Node SDK, React, TypeScript/JSX, Stripe Elements, Vite, Node built-in `node:test` and `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-09-14-run-payments-1a-secure-hold-architecture-design.md`

## Global Constraints

- Canonical design baseline: `423fc89c0a9dfd20285aa372c831b4f982884594`.
- Do not access production.
- Do not execute a production migration.
- Do not deploy.
- Do not push until separately authorized.
- Do not use live Stripe credentials.
- Do not make any real authorization, capture, refund, cancellation, or transfer.
- Provider interactions in Tasks 1-8 use injected fakes only.
- `STRIPE_CALLS=0` through Tasks 1-8.
- `PRODUCTION_DB_WRITES=0`.
- `RUNNER_PAYOUT_TRANSFERS=0`.
- Do not log or commit secret keys, JWTs, delivery PINs, receipt references, raw card data, or private customer content.
- Do not weaken existing lifecycle, responsive, privacy, or Smart Handoff tests.
- Do not run `scripts/test_dedupe_webhook.js`, `scripts/test_crash_recovery.js`, or `scripts/test_rule_correctness.js`; they contain direct database mutation logic from an incompatible legacy SQL architecture.
- Existing whole-dollar RUNFORME monetary fields remain unchanged. Provider conversion to Stripe's smallest currency unit belongs only inside the payment-service boundary.
- No database schema change is planned unless a later RED test demonstrates a field that cannot be represented by the existing canonical Prisma models.
- `StripeWebhookEvent` already exists in the canonical Prisma schema and baseline migration and must be reused rather than replaced with the legacy `public.stripe_webhook_events` SQL contract.

---

## File Structure

### New backend files

`backend/src/services/runPaymentPolicy.js`
- Pure payment/lifecycle policy.
- No Prisma.
- No Stripe SDK.
- Computes capture totals and determines authorization/capture/payout eligibility.

`backend/src/services/runPaymentPolicy.test.js`
- Pure `node:test` coverage for state transitions and financial bounds.

`backend/src/services/paymentService.js`
- Provider adapter around an injected Stripe client.
- Owns manual-capture PaymentIntent create/retrieve/capture/cancel calls.
- Owns provider idempotency keys and dollars-to-smallest-unit conversion.
- Contains no RUNFORME requester/runner authorization rules.

`backend/src/services/paymentService.test.js`
- Uses fake Stripe methods only.
- Proves exact provider request shapes and zero real provider dependency.

`backend/src/services/secureHoldService.js`
- Orchestrates Secure Hold against injected Prisma/payment service.
- Owns provider reconciliation and the transition to `authorizationStatus="authorized"`.
- Calls an injected offer-release callback only after verified authorization.

`backend/src/services/secureHoldService.test.js`
- Uses in-memory Prisma/payment fakes.
- Proves ownership-independent business state orchestration and idempotency.

`backend/src/services/runPaymentSettlement.js`
- Orchestrates capture/release decisions from canonical run state.
- Ensures capture succeeds before payout becomes ready.

`backend/src/services/runPaymentSettlement.test.js`
- Proves delivery/capture/manual-review/payout gates without a database or Stripe.

`backend/src/services/stripeWebhookReconciler.js`
- Maps supported verified Stripe events to canonical Prisma updates.
- Uses `StripeWebhookEvent` for dedupe.
- Never targets legacy snake_case Run columns.

`backend/src/services/stripeWebhookReconciler.test.js`
- Uses Prisma fakes.
- Covers dedupe, supported events, unsupported events, and PaymentIntent/run matching.

### Existing backend files to modify

`backend/src/routes/runs.js`
- Replace placeholder Secure Hold internals with `secureHoldService`.
- Preserve requester/admin authorization and current runner-offer dispatch infrastructure.
- Stop setting `ready_for_payout` before successful capture.
- Integrate settlement at completion.
- Integrate authorization release into any existing cancellation/expiration path that ends a run before capture.

`backend/src/routes/webhooks.js`
- Preserve raw-body signature verification.
- Replace `pool.query` SQL logic with Prisma-backed reconciliation.
- Remove charge/transfer legacy schema assumptions.

`backend/src/config/db.js`
- No behavior change expected.
- Remains canonical PrismaClient export.

### Existing frontend files to modify

`frontend/src/Dashboard.jsx`
- Secure Hold action receives client secret from `/api/runs/:runId/authorize-hold`.
- Presents PaymentPage through the existing requester Secure Hold surface.
- Calls `/authorize-hold` again after Stripe client confirmation to reconcile backend state.
- Removes placeholder copy and placeholder-state assumptions.

`frontend/src/pages/PaymentPage.tsx`
- Remains presentation-only.
- Adds explicit callbacks for successful `requires_capture` confirmation and cancellation/error.
- Does not directly mark RUNFORME run state.

`frontend/src/App.jsx`
- Remove `/api/payments/create-intent`.
- Remove its independent `clientSecret/showPayment/activeRunId` payment lifecycle.
- Keep the canonical Stripe `Elements` provider around the requester experience.

`frontend/src/components/requester/RequesterMobileShell.jsx`
- Replace `placeholder_authorized` checks with canonical authorization state checks.

### Legacy candidates, removal only after reachability proof

`frontend/src/components/PaymentModal.jsx`

`frontend/src/StripeWrapper.jsx`

`frontend/src/stripe.js`

Removal is not allowed until a focused source/import test proves that no live code depends on each file.

---

# Task 1: Pure Payment Policy Contracts

**Files:**
- Create: `backend/src/services/runPaymentPolicy.test.js`
- Create after RED: `backend/src/services/runPaymentPolicy.js`

**Interfaces:**
- Produces:
  - `computeCaptureAmount(run): number`
  - `requiresProviderAuthorization(run): boolean`
  - `isProviderAuthorized(run): boolean`
  - `evaluateCaptureEligibility(run): { eligible: boolean, reason: string, captureAmount: number | null }`
  - `payoutStatusAfterCapture(paymentStatus): string`

- [ ] **Step 1: Write RED tests for capture calculation**

Test exact whole-dollar behavior:

```js
const assert = require("node:assert/strict");
const test = require("node:test");

const {
  computeCaptureAmount,
  evaluateCaptureEligibility,
  payoutStatusAfterCapture,
} = require("./runPaymentPolicy");

test("capture amount is receiptAmount + runnerPayout + platformFee", () => {
  assert.equal(
    computeCaptureAmount({
      receiptAmount: 10,
      runnerPayout: 5,
      platformFee: 3,
    }),
    18
  );
});
```

Add cases for:
- missing receipt;
- negative/non-integer values rejected;
- authorization not `authorized`;
- delivery not confirmed;
- `requiresManualReview=true`;
- capture amount over `holdAmount`;
- exact hold boundary;
- `paymentStatus="captured"` returns `ready_for_payout`;
- all noncaptured states remain not ready.

- [ ] **Step 2: Run RED**

Run from repository root:

```powershell
node --test backend/src/services/runPaymentPolicy.test.js
```

Expected: FAIL because `runPaymentPolicy.js` does not exist.

- [ ] **Step 3: Implement the pure policy**

Implement without Prisma, Express, environment variables, sockets, or Stripe.

Canonical capture formula:

```js
captureAmount =
  Number(run.receiptAmount) +
  Number(run.runnerPayout) +
  Number(run.platformFee);
```

Canonical capture requirements:
- `authorizationStatus === "authorized"`;
- receipt uploaded;
- `deliveryConfirmedAt` present;
- `requiresManualReview !== true`;
- capture amount positive;
- capture amount `<= holdAmount`.

- [ ] **Step 4: Run GREEN**

```powershell
node --test backend/src/services/runPaymentPolicy.test.js
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/services/runPaymentPolicy.js backend/src/services/runPaymentPolicy.test.js
git commit -m "Add canonical run payment policy"
```

---

# Task 2: Provider-Isolated Stripe Payment Service

**Files:**
- Create: `backend/src/services/paymentService.test.js`
- Create after RED: `backend/src/services/paymentService.js`

**Interfaces:**
- Produces:

```js
createPaymentService({
  stripe,
  currency,
})
```

with methods:

```js
createAuthorization({ runId, requesterId, holdAmount })
retrieveAuthorization(paymentIntentId)
captureAuthorization({ paymentIntentId, runId, amount })
cancelAuthorization({ paymentIntentId, runId })
```

- [ ] **Step 1: Write RED fake-provider tests**

Use an object fake:

```js
const fakeStripe = {
  paymentIntents: {
    create: async () => {},
    retrieve: async () => {},
    capture: async () => {},
    cancel: async () => {},
  },
};
```

Assert `createAuthorization` calls `paymentIntents.create` with:
- amount converted from whole dollars to smallest unit exactly once;
- configured currency;
- `capture_method: "manual"`;
- metadata containing only non-sensitive identifiers;
- deterministic provider idempotency key associated with run authorization.

Assert capture uses a deterministic capture idempotency key and sends only the server-supplied amount.

Assert cancel uses a deterministic cancellation idempotency key.

- [ ] **Step 2: Run RED**

```powershell
node --test backend/src/services/paymentService.test.js
```

Expected: FAIL because implementation does not exist.

- [ ] **Step 3: Implement minimal payment service**

The module must not instantiate Stripe itself.

It accepts an injected Stripe client so tests cannot reach Stripe.

Use a helper equivalent to:

```js
function dollarsToMinorUnits(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Payment amount must be a positive whole-dollar integer");
  }

  return amount * 100;
}
```

Provider idempotency identities must be stable for a run and operation:
- authorization;
- capture;
- cancellation.

- [ ] **Step 4: Run GREEN**

```powershell
node --test backend/src/services/paymentService.test.js
```

Expected: PASS with fake provider call counts only.

- [ ] **Step 5: Re-run policy tests**

```powershell
node --test backend/src/services/runPaymentPolicy.test.js backend/src/services/paymentService.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/src/services/paymentService.js backend/src/services/paymentService.test.js
git commit -m "Add provider-isolated secure hold payment service"
```

---

# Task 3: Secure Hold Backend Canonicalization

**Files:**
- Create: `backend/src/services/secureHoldService.test.js`
- Create after RED: `backend/src/services/secureHoldService.js`
- Modify after service GREEN: `backend/src/routes/runs.js`

**Interfaces:**
- Consumes:
  - `paymentService.createAuthorization`
  - `paymentService.retrieveAuthorization`
- Produces:

```js
authorizeSecureHold({
  run,
  prisma,
  paymentService,
  releasePendingOffers,
})
```

Result shapes:

```js
{
  state: "requires_confirmation",
  run,
  clientSecret,
}
```

or:

```js
{
  state: "authorized",
  run,
  clientSecret: null,
}
```

- [ ] **Step 1: Write RED service tests**

Cover:
- positive `holdAmount` required;
- first call creates one PaymentIntent and stores `paymentIntentId`;
- first call does not release offers while provider state still requires client confirmation;
- repeated call with existing `paymentIntentId` retrieves instead of creating a second PaymentIntent;
- `requires_capture` maps to `authorizationStatus="authorized"` and `paymentStatus="authorized"`;
- offers release exactly once after verified authorization;
- provider failure does not release offers;
- already-authorized run is idempotent.

Use fake Prisma methods and fake provider methods. No database URL may be read.

- [ ] **Step 2: Run RED**

```powershell
node --test backend/src/services/secureHoldService.test.js
```

Expected: FAIL because service does not exist.

- [ ] **Step 3: Implement service**

Do not move requester/admin authorization into the service; route ownership remains in `runs.js`.

Do not set `placeholder_authorized` or `hold_placeholder` in the real provider path.

- [ ] **Step 4: Run service GREEN**

```powershell
node --test backend/src/services/secureHoldService.test.js
```

Expected: PASS.

- [ ] **Step 5: Replace placeholder route internals**

At the existing:

```text
POST /api/runs/:runId/authorize-hold
```

preserve:
- run ID validation;
- authentication;
- requester/admin authorization;
- run lookup;
- existing Socket.IO/offer infrastructure.

Replace the placeholder update with the canonical service.

The route must return `clientSecret` only when client confirmation is required.

The same endpoint is called again after frontend Stripe confirmation; the second invocation retrieves the existing PaymentIntent and, if Stripe reports `requires_capture`, marks the run authorized and releases offers.

- [ ] **Step 6: Add a source-contract test**

Create a small `node:test` contract test proving `runs.js` no longer writes:
- `placeholder_authorized`;
- `hold_placeholder`;

inside the Secure Hold route and still exposes `/authorize-hold`.

- [ ] **Step 7: Run backend payment tests**

```powershell
node --test backend/src/services/runPaymentPolicy.test.js backend/src/services/paymentService.test.js backend/src/services/secureHoldService.test.js
```

Run the new route-contract test separately.

Expected: PASS.

- [ ] **Step 8: Commit**

Stage only Task 3 files and commit:

```powershell
git commit -m "Canonicalize secure hold authorization"
```

---

# Task 4: Capture and Payout Gating

**Files:**
- Create: `backend/src/services/runPaymentSettlement.test.js`
- Create after RED: `backend/src/services/runPaymentSettlement.js`
- Modify: `backend/src/routes/runs.js`

**Interfaces:**
- Produces:

```js
settleRunPayment({
  run,
  prisma,
  paymentService,
})
```

and:

```js
releaseRunAuthorization({
  run,
  prisma,
  paymentService,
})
```

- [ ] **Step 1: Write RED settlement tests**

Cover:
- no capture before delivery confirmation;
- no capture without uploaded receipt when receipt is required;
- no capture while manual review is active;
- final amount calculated server-side;
- final amount greater than hold enters `manual_review_required`;
- no provider capture in over-hold case;
- successful provider capture sets `paymentStatus="captured"`;
- only successful capture sets `payoutStatus="ready_for_payout"`;
- failed capture sets `paymentStatus="capture_failed"` and payout remains not ready;
- cancellation releases authorized PaymentIntent and captures nothing;
- repeated capture/cancel operations reconcile rather than duplicate.

- [ ] **Step 2: Run RED**

```powershell
node --test backend/src/services/runPaymentSettlement.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement settlement service**

Use `runPaymentPolicy.evaluateCaptureEligibility()`.

Never trust `finalAmount` from request body.

Persist canonical `finalAmount` calculated from stored receipt/payout/fee fields.

- [ ] **Step 4: Run GREEN**

```powershell
node --test backend/src/services/runPaymentSettlement.test.js
```

Expected: PASS.

- [ ] **Step 5: Remove premature payout readiness from lifecycle**

Audit every existing `ready_for_payout` write in `runs.js`.

Receipt upload, manual-review approval, and delivery confirmation may establish eligibility but must not mark payout ready before capture.

Only verified successful capture may produce:

```js
payoutStatus: "ready_for_payout"
```

- [ ] **Step 6: Integrate capture into completion**

Before final `status="completed"` financial closure:
- validate delivery/receipt/manual-review rules;
- call settlement;
- fail closed if capture fails;
- do not present financially resolved completion on failed capture.

- [ ] **Step 7: Integrate cancellation/release**

For any existing run-ending path before capture:
- retrieve existing provider state;
- cancel/release an outstanding manual authorization;
- persist `paymentStatus="canceled"` only after verified provider result.

Do not invent a new user-facing cancellation feature if none currently exists.

- [ ] **Step 8: Run payment regression set**

```powershell
node --test backend/src/services/*.test.js
```

Expected: all payment-service tests PASS.

- [ ] **Step 9: Commit**

```powershell
git commit -m "Gate completion and payout on payment capture"
```

---

# Task 5: Prisma-Aligned Stripe Webhook Reconciliation

**Files:**
- Create: `backend/src/services/stripeWebhookReconciler.test.js`
- Create after RED: `backend/src/services/stripeWebhookReconciler.js`
- Modify: `backend/src/routes/webhooks.js`
- No schema modification expected.

**Interfaces:**
- Produces:

```js
reconcileStripeEvent({
  event,
  prisma,
})
```

Return:

```js
{
  deduped: boolean,
  applied: boolean,
  reason: string,
}
```

- [ ] **Step 1: Write RED reconciler tests**

Use fake Prisma implementations of:
- `stripeWebhookEvent`;
- `run`.

Cover:
- duplicate event ID is idempotent;
- supported PaymentIntent event links by canonical `paymentIntentId`;
- PaymentIntent authorization reconciliation;
- captured PaymentIntent reconciliation;
- canceled PaymentIntent reconciliation;
- unsupported event acknowledged without Run mutation;
- event whose PaymentIntent does not map to a Run does not mutate unrelated runs.

- [ ] **Step 2: Run RED**

```powershell
node --test backend/src/services/stripeWebhookReconciler.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement canonical Prisma reconciler**

Use only Prisma model/property names.

Do not reference:
- `payment_intent_id`;
- `charge_id`;
- `transfer_id`;
- `transfer_status`;
- raw SQL table `runs`.

- [ ] **Step 4: Run GREEN**

```powershell
node --test backend/src/services/stripeWebhookReconciler.test.js
```

Expected: PASS.

- [ ] **Step 5: Rewrite webhook route**

Preserve:

```js
express.raw({ type: "application/json" })
```

Preserve Stripe signature verification.

Replace all `pool.query` logic with the canonical reconciler.

Invalid signatures return HTTP 400.

Unsupported valid events return normal acknowledgment without financial mutation.

- [ ] **Step 6: Add webhook source guards**

Add a test that reads `backend/src/routes/webhooks.js` and asserts absence of legacy identifiers and `pool.query`.

- [ ] **Step 7: Verify Prisma migration coverage**

Read-only verification must prove the existing canonical baseline migration contains the `StripeWebhookEvent` table required by the current Prisma model.

If this proof passes, create no migration.

If it fails, stop the task and return a separate migration-design blocker rather than silently creating schema.

- [ ] **Step 8: Run payment test set**

```powershell
node --test backend/src/services/*.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git commit -m "Align Stripe webhook reconciliation with Prisma"
```

---

# Task 6: Frontend Secure Hold Consolidation

**Files:**
- Modify: `frontend/src/Dashboard.jsx`
- Modify: `frontend/src/pages/PaymentPage.tsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/requester/RequesterMobileShell.jsx`
- Create or extend focused source tests under `frontend/src`.

**Interfaces:**
- `PaymentPage` receives:

```ts
type Props = {
  clientSecret: string;
  runId: number;
  onAuthorized: (runId: number) => Promise<void> | void;
  onCancel?: () => void;
};
```

- [ ] **Step 1: Write RED frontend contract tests**

Assert:
- `App.jsx` does not contain `/api/payments/create-intent`;
- Secure Hold still calls `/api/runs/${runId}/authorize-hold`;
- placeholder copy/state is absent;
- canonical `authorized` state is represented;
- PaymentPage invokes `onAuthorized(runId)` only after Stripe returns `requires_capture`.

Use existing `node:test` source-contract style. Do not introduce a browser test framework solely for this task.

- [ ] **Step 2: Run RED**

Run the exact new focused frontend test via:

```powershell
node --test frontend/src/<new-payment-contract-test>.test.js
```

Expected: FAIL against current frontend.

- [ ] **Step 3: Update PaymentPage**

Keep card handling inside Stripe Elements.

After:

```js
result.paymentIntent?.status === "requires_capture"
```

call `onAuthorized(runId)`.

Do not call a `/api/payments/mark-authorized` endpoint.

Do not send raw card information to the backend.

- [ ] **Step 4: Update Dashboard**

First Secure Hold click:
- POST canonical `/authorize-hold`;
- if response returns `clientSecret`, render PaymentPage associated with that run;
- do not report the run authorized yet.

After PaymentPage callback:
- POST the same `/authorize-hold` endpoint again;
- backend reconciles existing PaymentIntent;
- refresh canonical run state;
- only then show authorized success.

Preserve duplicate-click guards.

- [ ] **Step 5: Update Secure Hold copy**

Remove:
- placeholder claim;
- “Stripe PaymentIntent wiring will be added later” copy;
- placeholder-specific button state/title.

Use state-driven messaging that distinguishes:
- authorization required;
- card confirmation required;
- authorizing/reconciling;
- authorized;
- authorization failed/manual review.

- [ ] **Step 6: Remove App's competing business flow**

Remove App-local:
- `/api/payments/create-intent`;
- `startPayment`;
- independent payment screen switching if no longer required;
- redundant `onStartPayment` plumbing.

Keep the single canonical `Elements stripe={stripePromise}` ownership needed by the requester UI.

- [ ] **Step 7: Run focused frontend tests**

Run the new payment contract test plus:

```powershell
node --test frontend/src/lib/stripeInitialization.test.js
node --test frontend/src/nav-shell.test.js
node --test frontend/src/requester-responsive.test.js
node --test frontend/src/responsive-foundation.test.js
node --test frontend/src/RunnerDashboard.mobile-layout.test.js
node --test frontend/src/runner-responsive.test.js
```

Expected: PASS.

- [ ] **Step 8: Run lint/build**

```powershell
Set-Location frontend
npm run lint
npm run build
Set-Location ..
```

Expected: both PASS.

- [ ] **Step 9: Commit**

```powershell
git commit -m "Consolidate requester secure hold payment flow"
```

---

# Task 7: Proven Legacy Payment Cleanup

**Files under review:**
- `frontend/src/components/PaymentModal.jsx`
- `frontend/src/StripeWrapper.jsx`
- `frontend/src/stripe.js`

**Files retained:**
- `frontend/src/lib/stripe.ts`
- `frontend/src/lib/stripeInitialization.js`
- `frontend/src/lib/stripeInitialization.test.js`

- [ ] **Step 1: Write reachability guard**

Create a source test that scans `frontend/src` and proves there are no external imports of:
- `PaymentModal`;
- `StripeWrapper`;
- `../stripe` or `./stripe` that resolve to legacy `frontend/src/stripe.js`.

The test must exclude the candidate file itself when counting self-name matches.

- [ ] **Step 2: Run proof before deletion**

```powershell
node --test frontend/src/<legacy-payment-reachability-test>.test.js
```

Expected: PASS only if files are actually unreachable.

- [ ] **Step 3: Delete proven dead files**

Remove only candidates proven unreachable.

This removes the known hard-coded publishable-key source without printing or copying the key.

- [ ] **Step 4: Run reachability test again**

Expected: PASS.

- [ ] **Step 5: Run Stripe initialization test, lint, build**

```powershell
node --test frontend/src/lib/stripeInitialization.test.js

Set-Location frontend
npm run lint
npm run build
Set-Location ..
```

Expected: PASS.

- [ ] **Step 6: Secret/config source scan**

Search tracked frontend code for hard-coded Stripe publishable-key literals by pattern and report count only.

Expected:

```text
HARDCODED_STRIPE_PUBLISHABLE_KEY_MATCH_COUNT=0
```

Never print matching values.

- [ ] **Step 7: Commit**

```powershell
git commit -m "Remove unreachable legacy Stripe frontend paths"
```

---

# Task 8: Full Inert Regression and Review Gate

**Files:** no implementation changes expected.

- [ ] **Step 1: Run all new backend payment tests**

```powershell
node --test backend/src/services/*.test.js
```

Expected: PASS.

- [ ] **Step 2: Run all frontend Node tests**

Run every `*.test.js` file under `frontend/src` individually through `node --test`, or as one resolved file list.

Expected: PASS.

- [ ] **Step 3: Run frontend lint**

```powershell
Set-Location frontend
npm run lint
Set-Location ..
```

Expected: PASS.

- [ ] **Step 4: Run frontend build**

```powershell
Set-Location frontend
npm run build
Set-Location ..
```

Expected: PASS.

- [ ] **Step 5: Run repository diff checks**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors.

- [ ] **Step 6: Static provider-isolation gate**

Confirm new unit tests use injected Stripe fakes.

Confirm no test invokes:
- real Stripe SDK network methods;
- production DB;
- production URLs;
- legacy SQL diagnostic scripts.

Expected:

```text
STRIPE_CALLS=0
PRODUCTION_DB_WRITES=0
DEPLOYMENTS=0
```

- [ ] **Step 7: Formal implementation review**

Compare changed files line-by-line against the approved design.

Required findings:
- one Secure Hold business entrypoint;
- authorization gates runner dispatch;
- capture amount server computed;
- over-hold goes to manual review;
- payout waits for capture;
- webhook is Prisma-aligned;
- legacy raw SQL removed;
- nonexistent `/api/payments/create-intent` removed;
- delivery PIN/privacy behavior unchanged;
- Smart Handoff behavior unchanged.

- [ ] **Step 8: Stop before provider validation**

Do not proceed automatically to Stripe test mode.

Return:

```text
RUN_PAYMENTS_1A_TASK8_IMPLEMENTATION_GATE=PASS
STRIPE_TEST_MODE_NOT_STARTED=YES
LIVE_STRIPE_CALLS=0
PRODUCTION_DB_WRITES=0
DEPLOYMENTS=0
```

Task 9 requires separate explicit authorization.

---

# Task 9: Separately Authorized Stripe Test-Mode Validation

This task is intentionally not executable from the authority granted by this plan.

Before execution, require explicit authorization for bounded Stripe **test-mode** provider calls.

Validation must use:
- test-mode Stripe configuration only;
- synthetic run/payment data;
- no production database;
- no real customer card;
- no live charges;
- no production deployment.

Required lifecycle validation:
1. create manual-capture test authorization;
2. confirm through Stripe test mode;
3. reconcile `requires_capture`;
4. verify runner dispatch gate;
5. process synthetic receipt/delivery;
6. capture bounded final amount;
7. verify unused authorization remainder release behavior;
8. verify payout readiness only after capture;
9. exercise cancellation/release in an independent synthetic case;
10. verify webhook replay idempotency.

Do not perform Task 9 without separate approval.

---

# Task 10: Separately Authorized Production Readiness / Activation Gate

No deployment or production payment activation is authorized by this implementation plan.

A later gate must independently verify:
- implementation commit history;
- full regression results;
- Stripe test-mode evidence;
- production environment variable names and presence without printing values;
- production database migration compatibility;
- webhook endpoint/signature configuration;
- rollback procedure;
- payment state rollback/reconciliation procedure;
- observability without sensitive values;
- live-mode authorization boundaries.

Production activation requires a separate explicit decision after that review.

---

# Definition of Done for Tasks 1-8

Tasks 1-8 may be considered implementation-complete only if all are true:

- one canonical `/api/runs/:runId/authorize-hold` Secure Hold flow exists;
- no active frontend path calls `/api/payments/create-intent`;
- provider calls are isolated behind `paymentService`;
- unit tests use injected fakes;
- runner offers are not released before verified authorization;
- capture occurs only after approved completion eligibility;
- capture amount equals stored receipt amount + runner payout + platform fee;
- capture cannot exceed authorized hold;
- over-hold transitions to manual review without automatic top-up;
- failed capture never makes payout ready;
- successful capture is required for `ready_for_payout`;
- cancellation/termination before completion releases an outstanding authorization;
- webhook reconciliation uses Prisma and canonical camelCase fields;
- duplicate webhook events are idempotent;
- legacy raw-SQL webhook assumptions are absent;
- dead frontend Stripe paths are removed only after reachability proof;
- hard-coded Stripe publishable-key source count is zero;
- existing responsive/lifecycle/privacy/Smart Handoff tests remain green;
- no live Stripe request occurred;
- no production DB write occurred;
- no deployment occurred.
