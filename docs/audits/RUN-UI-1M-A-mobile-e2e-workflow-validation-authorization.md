# RUN-UI-1M-A — Mobile E2E Validation Preflight and Execution Contract

## Result

**PREFLIGHT PASS; CONTROLLED E2E EXECUTION BLOCKED AND NOT AUTHORIZED.**

RUN-UI-1M-A is inspection and execution-contract definition only. It does not authorize execution of the requester-to-runner workflow, starting mutation-capable services, or issuing any mutating UI, API, database, account, payment, or lifecycle action.

## Baseline

- Repository: `C:\Users\emmli\Documents\runforme-recovered`
- Canonical branch: `main`
- Exact baseline: `96d04812c034e3710f95afaf9f0317165acc01f2`
- Baseline subject: `Complete RUNFORME mobile shell redesign`
- Inspection date: 2026-08-27
- `RUN-UI-1L` is **CLOSED AND PUSHED** at the exact baseline above.
- RUN-UI-1M-A does not reopen or modify RUN-UI-1L.

## Corrected Authorization Boundary

### Authorized in RUN-UI-1M-A

- Read-only repository inspection.
- Read-only environment and configuration inspection.
- Identification of local frontend, backend, and database prerequisites.
- Identification of requester and runner test identity requirements.
- Mapping of the existing requester, secure-hold placeholder, runner, Smart Handoff, receipt, PIN, and completion workflow.
- Identification of UI, API, and persisted-state transitions for later validation.
- Definition of synthetic data, evidence, cleanup, and fail-closed requirements.
- Changes to this audit document only.

### Not authorized in RUN-UI-1M-A

- Creating, accepting, arriving, starting, or completing a run.
- Authorizing a secure hold placeholder.
- Changing runner availability or location.
- Uploading or submitting receipt proof.
- Confirming a delivery PIN.
- Creating or modifying test accounts.
- Any database or API mutation.
- Source, schema, configuration, or dependency changes.
- Starting services when doing so could enable application or database mutation.
- Production access, deployment, live Stripe/payment activity, or external notifications.
- Staging, committing, or pushing.

The prior one-cycle execution authorization is withdrawn. This document is not evidence that an E2E cycle ran or passed.

## Read-Only Inspection Findings

### Application topology

- Frontend: React/Vite in `frontend`; `npm run dev`, `npm run lint`, and `npm run build` are defined.
- Backend: Express/Socket.IO in `backend`; `npm start` and `npm run dev` are defined, with default port `5050`.
- Database: PostgreSQL through Prisma using `backend/prisma/schema.prisma` and `DATABASE_URL`.
- Frontend HTTP and Socket.IO clients use `VITE_API_URL`, falling back to `http://localhost:5050` only when the variable is absent.
- Backend mounts `/api/runs` and `/api/runners`; authentication is JWT Bearer authentication using `JWT_SECRET`.
- Backend CORS uses `FRONTEND_URL` plus built-in allowed origins.

### Current local readiness

- `backend/node_modules` and `frontend/node_modules` are present; root `node_modules` is absent and is not required by the identified frontend/backend scripts.
- `frontend/.env.local` exists and contains `VITE_API_URL`; its configured target is nonlocal or unresolved under the local-only safety rule. Its value was not copied into this audit.
- No backend `.env` file was found.
- `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NODE_ENV` were absent from the inspection process environment.
- Services were not started, health endpoints were not called, credentials were not tested, and database connectivity was not attempted.

These findings block later execution until a separately authorized checkpoint proves that all clients and services are isolated locally, mutation is intentionally permitted in that isolated environment, and no production or live integration can be reached.

## Required Local Prerequisites for a Later Execution Checkpoint

All gates below must be satisfied and evidenced before any mutating action:

1. Repository remains on `main` at the exact authorized execution baseline, with only explicitly allowed audit/evidence changes.
2. Node.js/npm versions are recorded and compatible with the installed lockfiles.
3. Frontend dependencies and backend dependencies are present or installed under separate authorization.
4. `VITE_API_URL` resolves exclusively to the designated local backend; nonlocal targets are prohibited.
5. A dedicated local `DATABASE_URL` resolves exclusively to a disposable PostgreSQL database and is demonstrably not production, shared staging, or another persistent environment.
6. A dedicated local `JWT_SECRET` is provided and is unrelated to any deployed secret.
7. `FRONTEND_URL` permits only the designated local frontend origin for HTTP and Socket.IO.
8. Live Stripe secret and webhook credentials are absent. The placeholder hold route must be used; no payment-intent UI or `/webhooks` traffic is allowed.
9. External email, SMS, push, webhook, analytics, and notification integrations are absent, disabled, or locally captured.
10. The local database schema matches `backend/prisma/schema.prisma` without running a migration under the execution checkpoint.
11. Two pre-existing disposable test identities and their credentials are available: one `requester`, one distinct `runner`.
12. The runner identity has a pending offer path available after eligible run creation; the later execution must not fabricate an offer directly in the database.
13. Two isolated browser profiles or equivalent contexts are available so requester and runner JWT/localStorage state cannot collide.
14. Mobile viewport/device, browser version, locale, and time zone are selected and recorded for both roles.
15. Synthetic receipt image and run values meet the data contract below.
16. A cleanup method is approved before execution and is limited to records created by the controlled cycle.
17. Frontend lint and production build pass before mutation, or the execution stops.

## Test Identity Requirements

- The requester and runner must be distinct, pre-existing, disposable local accounts.
- JWT claims must resolve to the correct database user IDs and roles: `requester` and `runner`.
- Neither account may use a real person's address, email, password, profile, payment method, or production identifier.
- Account registration is outside RUN-UI-1M-A and outside the later workflow cycle unless separately authorized.
- The requester token may see only requester-owned full run data, including the delivery PIN.
- Runner data must remain redacted: `redactRunForRunner` removes `deliveryPin`; the PIN may be learned only through the controlled requester-to-runner test handoff.
- Each role must use a separate browser storage context because authentication is kept in `localStorage` under `token`.

## Exact Later Mobile E2E Validation Sequence

The sequence below is a map for a later separately authorized checkpoint. No step was executed here.

| Step | Mobile UI action or observation | API contract | Expected persisted or visible transition |
|---:|---|---|---|
| 1 | Sign in with the pre-existing requester identity. | `POST /api/auth/login`; JWT contains requester `userId` and role. | Requester mobile shell loads; `GET /api/runs` returns requester-owned runs. |
| 2 | Create one synthetic purchase run with a positive item budget and an eligible, confirmed Smart Handoff selection. | `POST /api/runs` as requester. | New `Run`: `status=open`; generated `deliveryPin`; `authorizationStatus=not_required_dev`; `purchaseStatus=budget_pending`; `receiptStatus=not_uploaded`; `handoffEligibility=eligible`; pending runner `Offer` records created. |
| 3 | Verify the requester sees the estimated hold action and no live-payment claim. | Read via `GET /api/runs`; no mutation yet. | `holdAmount=itemBudgetEstimate+payout+platformFee+bufferAmount`; `maxRunnerSpend=itemBudgetEstimate+bufferAmount`; runner acceptance remains gated. |
| 4 | Authorize the secure-hold placeholder from the requester mobile UI. | `POST /api/runs/:runId/authorize-hold` as owning requester. | `authorizationStatus=placeholder_authorized`; `paymentStatus=hold_placeholder`; response reports `placeholder=true`, `charged=false`; eligible offers are emitted to runners. |
| 5 | Sign in separately as the pre-existing runner and verify the eligible open offer appears. | `POST /api/auth/login`, then `GET /api/runs`; Socket.IO `run.offer` may update the UI. | Available list requires `status=open` plus a pending `offerId`; runner response must not contain `deliveryPin`. |
| 6 | Change the runner to online only if the later checkpoint explicitly includes this mutation. | `POST /api/runners/status` with `{online:true}`. | UI status becomes online and `runner.status` events may emit; this endpoint does not persist availability in the inspected schema. |
| 7 | Accept the offered run. | `POST /api/runs/:runId/accept` as the offered runner. | Requires open/unassigned, hold authorized, Smart Handoff eligible, and pending offer; run becomes `assigned`, `assignedRunnerId` is set, accepted offer becomes `accepted`, others become `rejected`. |
| 8 | Verify Smart Handoff guidance on the active runner run. | Read-only UI observation of returned run fields. | Eligible nonstandard handoff/identity requirements and safe instructions render; blocked or unconfirmed handoffs must never reach acceptance. |
| 9 | Mark arrival. | `POST /api/runs/:runId/arrived` as assigned runner. | Run transitions `assigned -> arrived`; requester/runner receive updated state. |
| 10 | If exposed by the tested path, start the run. | `PATCH /api/runs/:runId/start` as assigned runner. | Run transitions `assigned|arrived -> in_progress`. This is optional because receipt/PIN/completion accept `arrived` or `in_progress`. |
| 11 | Select a synthetic receipt image and submit a whole-dollar receipt amount that does not exceed `maxRunnerSpend`. | Browser validates image type and maximum 1.5 MB; `POST /api/runs/:runId/receipt-proof` sends `{receiptAmount, receiptImageUrl}`. | `receiptStatus=uploaded`; `purchaseStatus=receipt_uploaded`; `finalAmount=receiptAmount+runnerPayout+platformFee`; no manual review; a compact `https://runforme.local/receipt-images/...` reference is stored, not image bytes. |
| 12 | Verify the requester run detail shows receipt state and privately displays the generated six-digit delivery PIN. | Requester `GET /api/runs`. | Requester sees receipt/final amount and PIN; runner API/UI still does not receive the PIN field. |
| 13 | After synthetic handoff verification, enter the requester-provided PIN in the runner UI. | `POST /api/runs/:runId/confirm-delivery` with `{deliveryPin}`. | Requires `arrived|in_progress`; `deliveryConfirmedAt` set; `purchaseStatus=delivered`; `payoutStatus=ready_for_payout` when receipt is uploaded and no review is required. |
| 14 | Complete the run. | `POST /api/runs/:runId/complete` as assigned runner. | Requires delivery confirmation, required receipt uploaded, and no manual review; `status=completed`; `purchaseStatus=completed`; completed run disappears from runner active state and appears in requester history. |
| 15 | Capture final requester and runner evidence, then execute the pre-approved cleanup. | Read-only verification followed only by separately authorized cleanup operations. | Controlled records are removed or explicitly retained with ownership and expiry recorded; both role sessions are cleared. |

The table deliberately selects receipt data below `maxRunnerSpend`; exceeding it sets `receiptStatus=review_required`, `requiresManualReview=true`, and `payoutStatus=manual_review_required`, introducing a requester approval branch that is outside the minimum happy-path cycle unless separately authorized.

## Synthetic Test-Data Contract

- Location and item text must be unmistakably synthetic and contain no real address or personal data.
- Payout: whole dollars from `$5` through `$1000`; use the lowest practical bounded value.
- Item budget: positive whole dollars no greater than `$5000` so hold and receipt gates are exercised.
- Platform fee and buffer: whole dollars from `$0` through `$1000` each.
- Receipt amount: whole dollars from `$1` through `$10000` and at or below `maxRunnerSpend` for the minimum happy path.
- Receipt image: generated/non-sensitive image, MIME type `image/*`, no larger than 1.5 MB, with a clearly synthetic filename.
- Smart Handoff: use an eligible nonstandard combination that requires explicit confirmation, such as `third_party_allowed` plus `physical_id_required`, with `handoffConfirmed=true`.
- Instructions: generic text at most 500 characters; no names, ID numbers, passwords, passcodes, account numbers, barcodes, or credentials.
- No payment method, live Stripe object, real geolocation, or real notification target.

## Evidence Contract

The later closeout must record:

- Branch, full HEAD, working-tree state, execution authorization, timestamp, and operator.
- Sanitized configuration classification proving local-only frontend, backend, database, CORS, Socket.IO, and integrations without disclosing secrets.
- Node/npm versions, install state, lint result, build result, and service health evidence.
- Browser/device/viewport details and isolated profile identifiers for both roles.
- Sanitized requester ID, runner ID, run ID, and accepted offer ID.
- For every table step: timestamp, UI screenshot, request method/path/status, relevant sanitized response fields, and resulting run state.
- Explicit proof that the runner response omitted `deliveryPin` and that the requester alone exposed it before handoff.
- Explicit proof that hold authorization returned placeholder-only/no-charge semantics.
- Socket/polling observations for offer, assignment, receipt, delivery, and completion updates.
- Browser console, network, backend log, and data-integrity anomalies.
- Cleanup commands/actions, affected synthetic IDs, result, and post-cleanup verification.
- A final statement confirming no production access, live payment, external notification, source/schema/config/dependency change, deployment, staging, commit, or push.

## Cleanup Contract

- Define ownership of every synthetic account, run, offer, and receipt reference before execution.
- Prefer a disposable local database that can be retired as a whole under separate cleanup authorization.
- If record-level cleanup is approved, target only the captured synthetic IDs; never use broad or unresolved deletion criteria.
- Delete dependent offers/ratings before the synthetic run if referential constraints require it; do not modify migrations or schema.
- Preserve audit screenshots/logs only after sanitizing tokens, passwords, secrets, PINs, and sensitive paths.
- Clear requester and runner browser storage and stop local services.
- Verify that no synthetic active run, pending offer, session token, or receipt artifact remains.
- If cleanup cannot be proven, mark the later checkpoint `BLOCKED_CLEANUP_INCOMPLETE`; do not claim PASS.

## Fail-Closed and Stop Conditions

Do not begin, or stop immediately, if:

- Branch or HEAD differs from the separately authorized execution baseline.
- Working-tree scope contains an unapproved file.
- Any URL, database host, credential, webhook, Stripe key, or integration is nonlocal, production, shared, or unresolved.
- The local database cannot be positively identified as disposable.
- Required pre-existing role accounts or isolated browser contexts are unavailable.
- Starting a service could reach a nonlocal database or integration.
- A live charge, payment intent, webhook, email, SMS, push, analytics, or external notification could occur.
- Real or sensitive data appears.
- A code, schema, configuration, dependency, migration, account-creation, or deployment change is needed.
- A lifecycle action is offered to the wrong role, runner data exposes the PIN, or another authorization boundary behaves unexpectedly.
- State diverges from the mapped transition, a response is ambiguous, or evidence cannot be captured.
- Cleanup scope is ambiguous or risks unrelated data.

After a stop condition, only safe shutdown, sanitized evidence preservation, and read-only diagnosis remain allowed.

## Next Separately Authorized Checkpoint

Proposed next checkpoint: **RUN-UI-1M-B — Controlled Local Mobile End-to-End Workflow Validation Execution**.

RUN-UI-1M-B must receive separate explicit authorization. Its authorization must name the exact baseline, local frontend/backend/database targets, pre-existing synthetic identities, allowed mutation list, evidence destination, cleanup method, and whether runner availability/location and the optional `start` transition are included.

RUN-UI-1M-B must not begin while the current nonlocal-or-unresolved `VITE_API_URL` classification and missing local backend/database configuration remain unresolved under separately authorized configuration preparation.

## Scope Confirmation

- Read-only inspection only; no services started.
- No requester-to-runner E2E action executed.
- Only this RUN-UI-1M-A audit document changed.
- No source, schema, configuration, dependency, database, account, API, deployment, production, Stripe, notification, staging, commit, or push action performed.

## Disposition

`PREFLIGHT_PASS_EXECUTION_BLOCKED_PENDING_SEPARATE_RUN_UI_1M_B_AUTHORIZATION_AND_LOCAL_ISOLATION`
