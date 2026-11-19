# RUNFORME Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build RUNFORME Pulse v1 so runners receive one optional, future-oriented “better fit” check-in after three consecutive explicit runner Pass actions, with a 24-hour cooldown, safe dismissal, durable categorical feedback, and no impact on ranking, payments, payouts, or account status.

**Architecture:** Add a small backend Pulse domain boundary that records consecutive non-accepted offer state and categorical responses, expose minimal authenticated runner endpoints, and render a reusable Pulse sheet in the existing Runner dashboard. Keep the feature additive and isolated: no dispatch ranking changes, no payment/payout coupling, no Google Maps dependency, and no requester-facing behavior.

**Tech Stack:** Node.js backend, Prisma/PostgreSQL, React frontend, existing `apiRequest` client, Node `--test` contract tests.

**Spec:** `docs/superpowers/specs/2026-11-19-run-engage-1a-runforme-pulse-design.md`

## Global Constraints

- Trigger after 3 consecutive explicit runner Pass actions.
- Accepting a run resets the consecutive-miss counter.
- One Pulse prompt maximum per runner per 24-hour period.
- Never show Pulse during an active run.
- Prompt is optional and dismissible.
- V1 responses are categorical only.
- Exact v1 choices: `closer_to_me`, `better_value`, `better_timing`, `different_errand`, `done_for_now`, `something_else`.
- No runner ranking, dispatch priority, payment, payout, suspension, or account-status consequences.
- Pulse data is not requester-visible.
- No Google Maps dependency.
- Reuse existing RUNFORME mobile-first visual system.

## Review Focus

- Duplicate offer-expiry processing must not increment the same runner/run miss more than once; pin idempotency in backend Pulse state tests.
- A runner who accepts immediately after becoming eligible must not still receive a stale Pulse prompt; pin reset-before-read behavior.
- Another runner accepting first must remain neutral and must not increment Pulse state; pin this trust boundary in lifecycle tests.
- Cooldown must survive refresh and a new browser session; pin server-side timestamp enforcement rather than client-only state.
- Active-run transitions must suppress a previously eligible prompt; pin frontend visibility against assigned/arrived/in_progress states.
- Invalid or unknown feedback reason values must fail closed without mutating enforcement-sensitive fields; pin API validation and trust-boundary assertions.

---

### Task 1: Pulse persistence model

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_runner_pulse/migration.sql`
- Test: `backend/src/runner-pulse-schema-contract.test.js`

**Interfaces:**
- Consumes: existing `User` primary key and runner role model.
- Produces: additive persistence for per-runner Pulse state and response events.

- [ ] **Step 1: Write the failing schema contract**

Assert the Prisma schema contains a runner Pulse state model with runner identity, consecutive miss count, last prompt timestamp, and an event model with trigger, reason, dismissed/responded state, and timestamps.

- [ ] **Step 2: Run the schema contract and verify RED**

Run: `node --test src/runner-pulse-schema-contract.test.js` from `backend`  
Expected: FAIL because Pulse models do not exist.

- [ ] **Step 3: Add additive Prisma models and migration**

Use runner user id as the durable relation. Keep categorical response values as strings or enum values scoped to Pulse. Do not modify payment, payout, or account-status columns.

- [ ] **Step 4: Run the schema contract and Prisma validation**

Run: `node --test src/runner-pulse-schema-contract.test.js`  
Run: `npx prisma validate`  
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Add runner Pulse persistence foundation`

### Task 2: Pulse domain service and trigger rules

**Files:**
- Create: `backend/src/services/runnerPulseService.js`
- Create: `backend/src/runner-pulse-service-contract.test.js`

**Interfaces:**
- Consumes: Pulse persistence from Task 1 and existing runner/run ids.
- Produces:
  - `recordNonAcceptedOffer({ runnerId, runId })`
  - `resetPulseMisses({ runnerId })`
  - `getPulseEligibility({ runnerId, hasActiveRun })`
  - `recordPulseResponse({ runnerId, reason, dismissed })`

- [ ] **Step 1: Write failing service contracts**

Pin:
- first two unique non-accepted offers do not trigger;
- third unique non-accepted offer becomes eligible;
- duplicate processing of the same runner/run pair is idempotent;
- accepting a run resets miss count;
- 24-hour cooldown suppresses prompt;
- active run suppresses prompt;
- valid categorical reason records feedback;
- dismissal records without a reason;
- invalid reason rejects.

- [ ] **Step 2: Run service contracts and verify RED**

Run: `node --test src/runner-pulse-service-contract.test.js`  
Expected: FAIL because service does not exist.

- [ ] **Step 3: Implement the minimal domain service**

Keep all trigger/cooldown logic inside this service. Do not call payment, payout, ranking, or account enforcement code.

- [ ] **Step 4: Run service contracts**

Run: `node --test src/runner-pulse-service-contract.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Add RUNFORME Pulse trigger service`

### Task 3: Hook offer lifecycle into Pulse safely

**Files:**
- Modify: existing backend offer-expiry/non-acceptance path identified during implementation.
- Modify: existing backend accept-run path.
- Test: `backend/src/runner-pulse-offer-lifecycle-contract.test.js`

**Interfaces:**
- Consumes: Task 2 `recordNonAcceptedOffer` and `resetPulseMisses`.
- Produces: durable Pulse miss/reset state derived from real offer lifecycle events.

- [ ] **Step 1: Locate canonical offer-expiry and acceptance paths**

Document the exact functions/routes used for runner offer expiry/non-acceptance and acceptance before editing.

- [ ] **Step 2: Write failing lifecycle contracts**

Assert canonical non-acceptance records one miss, duplicates do not double-count, and canonical accept resets the counter before subsequent eligibility checks.

- [ ] **Step 3: Run lifecycle contracts and verify RED**

Run: `node --test src/runner-pulse-offer-lifecycle-contract.test.js`  
Expected: FAIL because lifecycle integration is absent.

- [ ] **Step 4: Wire only the canonical lifecycle paths**

Call Task 2 service methods without changing offer dispatch logic, ranking, or acceptance semantics.

- [ ] **Step 5: Run lifecycle contracts and existing offer/accept tests**

Expected: all PASS.

- [ ] **Step 6: Commit**

Commit message: `Wire Pulse into runner offer lifecycle`

### Task 4: Authenticated runner Pulse API

**Files:**
- Modify: existing runner route module that owns runner-authenticated endpoints.
- Test: `backend/src/runner-pulse-api-contract.test.js`

**Interfaces:**
- Consumes: Task 2 eligibility/response service.
- Produces:
  - authenticated GET endpoint returning `{ eligible, trigger, missCount }`
  - authenticated POST endpoint accepting either one valid reason or dismissal.

- [ ] **Step 1: Write failing API contracts**

Pin runner authentication, valid eligibility response, cooldown behavior, valid response recording, dismissal, invalid reason rejection, foreign-user isolation, and absence of payment/payout/account mutations.

- [ ] **Step 2: Run API contracts and verify RED**

Run: `node --test src/runner-pulse-api-contract.test.js`  
Expected: FAIL because endpoints do not exist.

- [ ] **Step 3: Implement minimal authenticated endpoints**

Return only fields needed by Runner UI. Never expose another runner’s Pulse state.

- [ ] **Step 4: Run API contracts**

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Expose authenticated runner Pulse API`

### Task 5: RUNFORME Pulse UI component

**Files:**
- Create: `frontend/src/components/runner/RunnerPulseSheet.jsx`
- Modify: `frontend/src/components/runner/index.js` if needed.
- Create: `frontend/src/runner-pulse-sheet-contract.test.js`

**Interfaces:**
- Consumes:
  - `open: boolean`
  - `onSelect(reason: string)`
  - `onDismiss()`
- Produces: accessible optional Pulse bottom sheet using exact approved copy and choices.

- [ ] **Step 1: Write failing UI contract**

Assert:
- heading is `Let’s find a better fit.`;
- supporting copy asks `What would make the next one work better for you?`;
- all six approved choices appear;
- dismiss action exists;
- no acceptance-rate, ranking, punishment, or payout language appears.

- [ ] **Step 2: Run UI contract and verify RED**

Run: `node --test src/runner-pulse-sheet-contract.test.js` from `frontend`  
Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement the component**

Reuse existing mobile shell primitives/styles. Keep it non-blocking and keyboard/focus accessible.

- [ ] **Step 4: Run UI contract**

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Add RUNFORME Pulse runner sheet`

### Task 6: Runner dashboard integration

**Files:**
- Modify: `frontend/src/RunnerDashboard.jsx`
- Create: `frontend/src/runner-pulse-integration-contract.test.js`

**Interfaces:**
- Consumes: Task 4 API and Task 5 component.
- Produces: eligibility fetch, active-run suppression, one-tap response submission, dismissal, and contextual acknowledgement copy.

- [ ] **Step 1: Write failing integration contracts**

Pin:
- eligibility is checked for online runner state;
- Pulse never renders during assigned/arrived/in_progress run;
- valid response posts approved categorical value;
- dismissal posts dismissed state;
- successful response closes sheet;
- acknowledgement copy maps to the selected approved choice;
- refresh does not bypass server cooldown.

- [ ] **Step 2: Run integration contracts and verify RED**

Run: `node --test src/runner-pulse-integration-contract.test.js`  
Expected: FAIL because dashboard integration is absent.

- [ ] **Step 3: Implement minimal dashboard integration**

Do not couple Pulse state to map, payout, receipt, delivery PIN, or completion state machines beyond active-run visibility suppression.

- [ ] **Step 4: Run integration and relevant runner tests**

Run Pulse integration plus runner responsive, online persistence, map/location, payout, and completed-history contracts.  
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Integrate RUNFORME Pulse into runner dashboard`

### Task 7: Full regression and trust-boundary verification

**Files:**
- No product files unless a regression correction is required.
- Update plan/spec notes only if implementation discovers a material documented constraint.

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: release-ready evidence for RUN-ENGAGE-1A.

- [ ] **Step 1: Run targeted backend Pulse suite**

Run all `runner-pulse-*.test.js` backend contracts.  
Expected: PASS.

- [ ] **Step 2: Run targeted frontend Pulse + runner suite**

Run Pulse UI/integration plus runner map, responsive, online, payouts, activity/history, and secure-hold contracts.  
Expected: PASS.

- [ ] **Step 3: Run full backend regression**

Run the canonical backend test command used by RUNFORME.  
Expected: PASS with no payment/payout/account regressions.

- [ ] **Step 4: Run full frontend regression**

Run: `node --test` from `frontend`  
Expected: PASS.

- [ ] **Step 5: Verify branch scope**

Confirm only Pulse-related backend/frontend files, additive migration, and design/plan docs changed.

- [ ] **Step 6: Commit any test-only corrections**

Use a narrowly scoped commit message if needed; otherwise no additional commit.

## Self-Review

- Spec coverage: trigger, reset, cooldown, dismissal, exact better-fit copy, exact choices, active-run suppression, durable response recording, privacy/trust constraints, and non-interference boundaries are assigned to tasks.
- Step granularity: each task has a RED → implementation → GREEN → commit cycle.
- Type consistency: service method names defined in Task 2 are reused by lifecycle/API tasks.
- Review Focus: duplicate expiry, stale eligibility after accept, server-side cooldown, active-run suppression, and invalid reason validation are each pinned in owning tasks.
- Proportion: plan stays at interface/test granularity and avoids embedding implementation bodies.


## Implementation Ruling

The existing offer lifecycle had no first-class runner decline/expiry event. Its only `rejected` state represented a different runner accepting the run first. Counting that as a miss would misclassify runner behavior. RUN-ENGAGE-1A therefore introduces an explicit runner Pass action, presented as **“Not this one”**, and only that action contributes to Pulse. Another runner winning a run remains neutral.
