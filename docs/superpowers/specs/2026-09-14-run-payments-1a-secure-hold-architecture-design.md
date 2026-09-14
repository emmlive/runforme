# RUN-PAYMENTS-1A — Canonical Secure Hold Architecture Design

## Status

**APPROVED DESIGN**

This specification defines the canonical RUNFORME Secure Hold payment architecture for the first production-capable payment implementation.

It does not authorize:

- live Stripe calls;
- production Stripe credentials;
- production database access;
- database migration execution;
- deployment;
- real charges, captures, refunds, transfers, or payouts;
- changes to production configuration;
- runner payout-provider implementation.

Implementation requires a separately approved implementation plan and bounded execution checkpoints.

## Baseline

- Repository: `C:\Users\emmli\Documents\runforme-recovered`
- Canonical baseline branch: `main`
- Canonical baseline SHA: `0a35e8985d263c05622e213ec1bfe17cf18be9a9`
- Design branch: `feature/run-payments-1a-design`
- Design worktree: `C:\Users\emmli\runforme-worktrees\run-payments-1a-design`
- Design date: 2026-09-14

RUN-UI-1N is CLOSED PASS at the canonical baseline and must not be reopened by this payment phase.

## Problem Statement

The existing RUNFORME payment architecture is split across incompatible paths.

The verified requester-to-runner lifecycle currently uses:

`POST /api/runs/:runId/authorize-hold`

That route is intentionally a placeholder. It records:

- `authorizationStatus = "placeholder_authorized"`
- `paymentStatus = "hold_placeholder"`
- `charged = false`

It then releases pending runner offers.

Separately, the active frontend contains a payment path in `App.jsx` that calls:

`POST /api/payments/create-intent`

and expects a Stripe `clientSecret`.

The current backend has no `/api/payments` router, no matching `create-intent` route, and no canonical PaymentIntent creation implementation.

The mounted Stripe webhook is also incompatible with the current persistence architecture:

- `backend/src/config/db.js` exports PrismaClient;
- the webhook treats it as a PostgreSQL pool and calls `pool.query(...)`;
- the webhook targets legacy snake_case database fields and transfer/charge columns not represented by the canonical Prisma `Run` model;
- the current migration history does not establish those legacy webhook fields.

Therefore payments are not production-ready and must be consolidated before any real Stripe activation.

## Architecture Decision

RUNFORME will use one canonical Secure Hold business boundary:

`POST /api/runs/:runId/authorize-hold`

The existing Secure Hold lifecycle will be evolved rather than replaced.

The route remains responsible for the business decision to authorize a run. Stripe-specific behavior will be delegated to a focused payment service.

RUNFORME will not create a competing independent `/api/payments/create-intent` business lifecycle.

## Core Payment Policy

### Authorization

Before runner dispatch, the requester authorizes an estimated Secure Hold.

The provider authorization amount is the server-computed `holdAmount`.

The authorization uses Stripe `capture_method = manual` semantics.

No runner offer may become actionable until the provider-backed authorization is confirmed.

### Capture

RUNFORME captures funds only after successful delivery/completion eligibility.

The canonical server-computed capture amount is:

`receiptAmount + runnerPayout + platformFee`

The frontend must never supply the authoritative capture total.

The capture amount may not exceed the amount originally authorized.

Any unused authorization amount is released through Stripe's normal authorization/capture behavior.

### Over-Hold Final Amount

If the final computed amount exceeds the authorized hold:

- automatic capture is blocked;
- RUNFORME does not automatically issue a top-up charge;
- the run enters manual review;
- runner payout is not marked ready.

### Runner Payout Readiness

`payoutStatus = "ready_for_payout"` is permitted only after requester payment capture succeeds.

Receipt upload, delivery confirmation, or run completion alone are insufficient to make payout ready.

This phase does not implement the external runner payout/transfer mechanism.

### Cancellation and Expiration

If a run is canceled, expires, or terminates before successful completion:

- the outstanding authorization is canceled/released;
- no amount is captured;
- failure to release the authorization produces an unresolved payment state and must not be presented as successfully released.

## Canonical State Ownership

The existing `Run` payment fields remain authoritative for this launch phase.

### `authorizationStatus`

The implementation should support explicit controlled states such as:

- `not_authorized`
- `authorizing`
- `authorized`
- `authorization_failed`
- `canceled`
- `manual_review_required`

`not_required_dev` may remain only where required by isolated/local development compatibility.

The existing placeholder state is transitional and must not represent production authorization.

### `paymentStatus`

The implementation should support the lifecycle:

- `pending_payment_method`
- `authorized`
- `capture_pending`
- `captured`

and explicit terminal/error states including:

- `canceled`
- `capture_failed`
- `refunded`
- `manual_review_required`

### Existing Monetary/Lifecycle Fields

The following existing fields remain part of the canonical contract:

- `paymentIntentId`
- `holdAmount`
- `maxRunnerSpend`
- `receiptAmount`
- `finalAmount`
- `purchaseStatus`
- `receiptStatus`
- `payoutStatus`
- `requiresManualReview`

No broad charge/transfer schema is added merely to preserve the legacy webhook.

## Component Boundaries

### Run Lifecycle — `backend/src/routes/runs.js`

The run lifecycle remains authoritative for:

- requester/admin authorization;
- requester ownership;
- run eligibility;
- positive hold validation;
- runner dispatch gating;
- receipt requirements;
- delivery confirmation;
- completion eligibility;
- manual-review gating;
- cancellation/expiration business rules;
- payout-readiness business rules.

Stripe SDK details must not become duplicated throughout this route.

### Payment Service

A focused payment service will own provider-specific operations:

- create manual-capture PaymentIntent;
- return the client secret required by Stripe Elements;
- inspect/reconcile authorization state;
- capture the final server-computed amount;
- cancel/release an outstanding authorization;
- normalize Stripe/provider errors;
- apply deterministic provider idempotency keys.

The payment service must not decide requester ownership, run eligibility, runner dispatch, delivery eligibility, or payout readiness.

### Frontend Secure Hold Flow

The existing Requester Secure Hold action remains the product entrypoint.

`App.jsx` must not remain the owner of a competing `/api/payments/create-intent` business flow after consolidation.

Raw card information must never be sent through RUNFORME backend application endpoints.

Stripe Elements or the approved Stripe client SDK remains responsible for card-data handling.

### Payment Presentation

`PaymentPage.tsx` may be retained as presentation if it cleanly supports the canonical Secure Hold sequence.

It must not independently decide that a run is authorized solely from browser state.

Provider confirmation must be reconciled to backend-authoritative run state.

### Legacy Frontend Payment Code

Current evidence shows no external references to:

- `frontend/src/StripeWrapper.jsx`
- `frontend/src/components/PaymentModal.jsx`

They are dead-code candidates.

`frontend/src/stripe.js` is also a duplicate Stripe initialization path candidate.

These files must not be removed until focused import/reachability tests prove removal is safe.

The known hard-coded Stripe publishable-key occurrence must not remain in canonical production source.

No secret Stripe key may ever be committed to frontend source.

## Authorization Sequence

1. Requester creates a run using the existing run creation contract.
2. Backend computes and persists the existing hold-related values.
3. Runner offers remain non-actionable while required Secure Hold authorization is absent.
4. Requester invokes `POST /api/runs/:runId/authorize-hold`.
5. Backend authenticates the user.
6. Backend verifies requester/admin authorization.
7. Backend verifies run existence and current eligibility.
8. Backend verifies `holdAmount > 0`.
9. Backend detects any existing PaymentIntent/authorization and reconciles before creating another.
10. Backend requests a Stripe PaymentIntent using manual capture.
11. Provider request uses the server-computed hold amount.
12. Backend returns only the provider data required for safe client confirmation, such as a client secret.
13. Stripe Elements/client SDK performs card confirmation.
14. Backend/provider reconciliation establishes the authoritative authorization result.
15. Only after provider-backed authorization is confirmed does RUNFORME release eligible pending runner offers.

The browser must not release runner offers or directly set payment state.

## Capture Sequence

Capture eligibility requires all applicable conditions to be satisfied:

- provider-backed authorization exists;
- receipt requirements are satisfied;
- delivery has been confirmed;
- run is eligible for completion;
- no unresolved manual-review condition exists;
- canonical final amount is computable;
- canonical final amount does not exceed authorized hold.

The backend computes:

`captureAmount = receiptAmount + runnerPayout + platformFee`

If `captureAmount > holdAmount`:

- do not call provider capture;
- mark manual review;
- do not make payout ready.

If eligible:

1. set payment state to a guarded capture-pending transition;
2. request provider capture for the exact computed amount;
3. reconcile the provider result;
4. set payment state to captured only on verified success;
5. set `payoutStatus = "ready_for_payout"` only after capture succeeds.

A failed capture must not be represented as financially completed.

## Idempotency and Concurrency

Every Stripe mutation must use a deterministic idempotency strategy tied to the run and operation.

Conceptual operation identities include:

- `run:<runId>:authorize`
- `run:<runId>:capture`
- `run:<runId>:cancel`

The exact provider-key format may be encapsulated in the payment service, but repeated execution of one logical operation must not create duplicate financial actions.

Database state transitions must also use guarded/conditional updates so concurrent requests cannot independently advance the same financial transition.

If an operation is retried after an uncertain response, RUNFORME must reconcile the existing provider object before creating a replacement.

## Webhook Architecture

Stripe webhooks are reconciliation signals, not the primary product-action entrypoint.

The canonical webhook must:

- receive the existing raw request body before JSON parsing;
- verify Stripe signatures;
- fail closed on invalid signatures;
- deduplicate events by Stripe event ID;
- persist event identity through canonical Prisma-backed persistence;
- map only explicitly supported events into RUNFORME state;
- acknowledge unsupported events without mutating financial state;
- remain safe under Stripe retries;
- avoid legacy raw SQL assumptions that diverge from the Prisma schema.

The current raw-SQL webhook implementation must be replaced rather than preserved through schema expansion.

Provider webhook state must never blindly overwrite lifecycle state without validating the associated run/PaymentIntent relationship.

## Webhook Event Persistence

The repository already contains a Prisma `StripeWebhookEvent` model.

Implementation planning must verify that the model has a corresponding canonical migration before relying on it.

If migration support is absent, implementation may add the smallest migration needed to establish canonical webhook idempotency persistence.

No production migration execution is authorized by this design.

## Error Handling

RUNFORME fails closed at financial boundaries.

### Authorization Failure

If provider authorization fails:

- run remains un-dispatchable;
- runner offers remain blocked;
- authorization/payment state reflects failure;
- no fake success state is emitted.

### Capture Failure

If capture fails:

- payment must not become captured;
- payout must not become ready;
- run becomes financially unresolved;
- the error is surfaced through controlled payment state;
- retries must follow the idempotency/reconciliation rules.

### Authorization Release Failure

If cancellation/release fails:

- do not report the authorization as successfully released;
- retain an unresolved state for reconciliation/manual action.

### Provider/Local State Disagreement

Provider state is reconciled through the canonical payment service.

Webhook payloads or client-side state must not arbitrarily overwrite canonical local business state.

## Security Boundaries

The implementation must preserve:

- authenticated requester/admin authorization;
- requester ownership checks;
- runner redaction rules;
- delivery PIN privacy;
- no raw card handling by RUNFORME backend routes;
- no secret/provider key values in logs, tests, screenshots, source, or audit artifacts;
- provider secret keys remain server-only;
- frontend receives only publishable/client-safe Stripe values;
- runner dispatch cannot occur before valid Secure Hold authorization.

No live provider call is authorized during implementation unless a later checkpoint explicitly authorizes isolated Stripe test-mode execution.

## Testing Strategy

Implementation follows test-driven development.

Focused RED/GREEN tests must cover at least:

1. requester ownership for Secure Hold authorization;
2. admin authorization behavior where intentionally preserved;
3. invalid/nonexistent run handling;
4. positive hold requirement;
5. runner dispatch blocked before provider-backed authorization;
6. duplicate authorization does not create duplicate provider operations;
7. manual-capture PaymentIntent creation uses server-computed hold amount;
8. backend does not accept raw card data;
9. provider authorization failure keeps runner dispatch blocked;
10. backend computes capture amount from canonical run fields;
11. capture is blocked before delivery confirmation;
12. capture is blocked while manual review is required;
13. over-hold final total enters manual review without provider capture;
14. successful capture gates payout readiness;
15. failed capture keeps payout not ready;
16. cancellation/expiration releases outstanding authorization and captures nothing;
17. duplicate capture/cancel requests are idempotent;
18. invalid webhook signature is rejected;
19. duplicate webhook event is idempotent;
20. supported webhook reconciliation uses canonical Prisma fields;
21. unsupported webhook events do not mutate run state;
22. current requester/runner lifecycle protections remain intact;
23. the protected mobile workflow and RUN-UI-1N responsive contracts do not regress.

Existing tests must not be weakened to make the payment implementation pass.

## Schema and Migration Scope

Prefer the smallest schema change needed for the approved payment architecture.

Do not add:

- `chargeId`;
- `transferId`;
- `transferStatus`;

solely to preserve legacy webhook behavior.

Do not introduce a broad payout-transfer subsystem.

Do not convert payment state strings into database enums during this phase unless later evidence proves it is required.

Any required migration must:

- be generated/reviewed as source first;
- be tested only in an explicitly isolated environment;
- never be applied to production without separate authorization.

## Out of Scope

RUN-PAYMENTS-1A does not include:

- live-mode Stripe activation;
- production credentials;
- production deployment;
- production migration execution;
- real customer charges;
- real captures/refunds;
- Stripe Connect onboarding;
- runner bank-account setup;
- automated runner transfers;
- payout-provider activation;
- chargebacks/disputes workflow;
- subscription billing;
- wallet/balance features;
- automatic over-hold top-up charges;
- redesign of unrelated requester/runner UI;
- changes to Smart Handoff semantics;
- changes to receipt or delivery-PIN privacy semantics.

## Implementation Order

The approved implementation sequence is:

1. canonical payment design and implementation plan;
2. RED payment-state/provider-isolation contracts;
3. focused payment service abstraction;
4. Secure Hold backend canonicalization;
5. canonical Prisma-aligned webhook replacement;
6. frontend Secure Hold consolidation;
7. legacy payment-code cleanup only after reachability proof;
8. full regression verification;
9. separately authorized isolated Stripe test-mode validation;
10. separately authorized production-readiness/activation gate.

No later step implicitly authorizes provider activity.

## Success Criteria

RUN-PAYMENTS-1A implementation is complete only when:

- there is one canonical Secure Hold business flow;
- required hold authorization is provider-backed rather than placeholder-only;
- runner dispatch cannot occur without verified authorization;
- server-side capture amount is deterministic and tested;
- capture occurs only after approved completion conditions;
- over-hold amounts fail into manual review;
- payout readiness requires successful capture;
- cancellation/expiration releases authorization without capture;
- webhook persistence/reconciliation matches canonical Prisma schema;
- financial operations are idempotent;
- active frontend payment flow no longer references a nonexistent backend business route;
- legacy/dead payment paths are either safely removed or explicitly isolated;
- all focused tests and existing regressions pass;
- no live/provider/production action occurs without separate approval.

## Safety Gate

Until a later explicit authorization:

- `STRIPE_CALLS=0`
- `LIVE_PAYMENT_ACTIONS=0`
- `PRODUCTION_DB_WRITES=0`
- `PRODUCTION_MIGRATIONS=0`
- `DEPLOYMENTS=0`
- `RUNNER_PAYOUT_TRANSFERS=0`
