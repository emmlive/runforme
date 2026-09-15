# RUN-PAYMENTS-1A Task 4 — Capture / Release Closure

## Status

Task 4 capture and payout gating is implemented and verified.

Authorization-release support is implemented at the canonical settlement-service layer but is intentionally not wired to a run lifecycle route because the current RUNFORME product does not define a run cancellation, expiration, or termination API surface.

## Capture lifecycle

The canonical completion path delegates payment capture to `captureRunPayment()` before persisting the Run as completed.

The settlement service:

- computes the final capture amount from server-authoritative Run state;
- requires canonical provider authorization;
- requires delivery confirmation;
- blocks capture while manual review is required;
- blocks capture when the final amount exceeds the authorized hold;
- performs provider capture through the injected payment service;
- marks `paymentStatus` as `captured`;
- makes `payoutStatus` `ready_for_payout` only after successful provider capture.

The run lifecycle no longer marks payout ready from receipt upload, delivery confirmation, manual-review approval, or completion directly.

## Authorization release

`releaseRunAuthorization()` exists in `runPaymentSettlement.js`.

It:

- refuses to release an already captured payment;
- requires a provider PaymentIntent identifier;
- delegates cancellation through the injected payment service;
- requires provider status `canceled`;
- persists canonical canceled authorization/payment state;
- leaves payout not ready.

Unit tests cover successful release and captured-payment protection.

## Lifecycle integration decision

Repository inspection found no existing run cancellation, expiration, termination, abort, or delete route.

The Prisma Run status contract currently documents:

`open | assigned | in_progress | completed`

No backend run lifecycle surface currently transitions a Run into a cancellation-like terminal state.

The frontend `AdminDisputes.jsx` contains a legacy-looking `Cancel (Refund)` dispute action, but it calls:

`PATCH /api/disputes/:runId/resolve`

with an action value of `cancel`.

No matching backend dispute route was found in the current backend source, and this action is therefore not treated as an authoritative Run termination lifecycle.

RUN-PAYMENTS-1A does not invent a new cancellation API merely to create a release call site.

## Deferred requirement

When a canonical Run cancellation / expiration / termination product flow is designed and implemented, that lifecycle must call `releaseRunAuthorization()` for outstanding uncaptured authorizations.

The lifecycle must fail closed and must never cancel or release a payment that has already reached canonical `captured` state.

## Safety posture

This task does not authorize:

- live Stripe calls;
- real payment capture;
- real authorization cancellation;
- production database writes;
- migrations;
- deployment;
- push;
- runner payout transfers.

Provider and production activation remain separately authorized phases.