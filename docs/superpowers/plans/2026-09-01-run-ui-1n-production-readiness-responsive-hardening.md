# RUN-UI-1N Production-Readiness UX & Responsive Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the existing RUNFORME Requester and Runner experiences into one production-ready, mobile-first responsive system across mobile, tablet, and desktop without changing validated product contracts.

**Architecture:** Keep `Dashboard.jsx` and `RunnerDashboard.jsx` as the role orchestrators, with `RequesterMobileShell`, extracted requester/runner presentation components, shared UI primitives, and existing CSS files providing the responsive layers. Establish shared sizing, gutters, safe-area, overflow, and navigation-clearance rules first; then harden each role against those rules without creating parallel applications or changing API ownership.

**Tech Stack:** React 19, Vite 7, React Router, CSS media queries/custom properties, Node's built-in `node:test`, Vite SSR loading for component markup tests, ESLint, and Vite production build.

**Spec:** `docs/superpowers/specs/2026-09-01-run-ui-1n-production-readiness-responsive-hardening-design.md`

## Global Constraints

- Mobile remains the primary experience and 390 x 844 remains a protected regression viewport.
- Use one fluid responsive system across 360, 390, 430, 768, 1024, and 1440 CSS pixels; these are representative validation widths, not separate applications.
- Preserve Requester destinations Home, Request, My Runs, and Menu.
- Preserve Runner destinations Home, Earnings, Activity, and Menu.
- Keep Requester reassuring, guided, and ownership-oriented; keep Runner operational and action-first; retain RUNFORME's own identity.
- Preserve run lifecycle semantics, `POST /api/runs`, acceptance, arrival, receipt proof, delivery confirmation, completion, Secure Hold, payment-state semantics, Smart Handoff contracts, authentication, provider behavior, Prisma schema, and production configuration.
- Do not add marketplace, earnings, activity, payment, provider, backend, schema, account, or unrelated settings functionality.
- Do not restore duplicated legacy RunDetailPanel-style UI or create duplicate primary actions.
- Do not make live payment/provider calls or access production during implementation or validation.
- If discovery proves a backend, schema, provider, or production-configuration change is required, stop and obtain separate authorization.
- Every code task follows a failing-test, minimal-change, focused-green, nearby-regression, diff-review, and exact-path-commit cycle.
- Never stage with `git add .`, `git add -A`, or an equivalent wildcard.

## File Structure and Ownership Map

The plan follows the inspected repository rather than introducing a new application shell:

- `docs/audits/RUN-UI-1N-A-responsive-architecture-implementation-map.md` — Task 1's durable read-only map of actual shells, components, styles, breakpoints, risks, and candidate files.
- `frontend/src/App.css` and `frontend/src/index.css` — Task 2's global root sizing, page overflow containment, shared responsive custom properties, and viewport-safe foundations.
- `frontend/src/styles/tokens.css` — Task 2's shared spacing, motion, focus, and responsive token additions only when an existing token is the correct owner.
- `frontend/src/responsive-foundation.test.js` — Task 2's Node/Vite-SSR contract test for shared width, gutter, overflow, and safe-area rules.
- `frontend/src/components/requester/RequesterMobileShell.css`, `RequesterCommandCenter.css`, `RequesterDashboardPolish.css`, and `frontend/src/requester-run-form.css` — Task 3's Requester layout, disclosure, form, navigation, wrapping, state, and focus hardening.
- `frontend/src/Dashboard.jsx` — Task 3 only where existing loading/error/state ownership or semantic markup must expose the already-owned Requester state; no payload conversion or API ownership moves.
- `frontend/src/requester-responsive.test.js` — Task 3's focused Requester SSR contract coverage.
- `frontend/src/RunnerDashboard.jsx` — Task 4's Runner shell, active/available state presentation, fixed navigation clearance, action ordering, and semantic state markup.
- `frontend/src/components/runner/RunnerCommandCenter.css`, `RunnerCommandCenter.jsx`, `RunnerFocusedRunSection.jsx`, `RunnerActionStatusPanel.jsx`, `RunnerOverviewHeader.jsx`, `RunnerRunCard.jsx`, `RunnerStatusSummary.jsx`, and `RunnerTrustChecklistSection.jsx` — Task 4's bounded Runner presentation changes where discovery maps a concern to that component.
- `frontend/src/runner-responsive.test.js` — Task 4's focused Runner SSR contract coverage, retaining the existing `frontend/src/RunnerDashboard.mobile-layout.test.js` regression.
- Existing shared primitives under `frontend/src/components/ui/` — Tasks 3 and 4 may consume these; create no replacement primitive unless Task 1 proves an existing primitive cannot express the required semantic control.
- Existing `frontend/src/lib/stripeInitialization.test.js` — Task 6 preserves the R3C provider-inertness regression; it is not rewritten for responsive work.

Each later task consumes the selectors, state ownership, and layout contracts produced by earlier tasks. Any candidate file not confirmed by Task 1 is excluded until a separately authorized scope decision.

### Task 1: Responsive architecture audit and exact implementation map

**Checkpoint:** RUN-UI-1N-A

**Files:**
- Create: `docs/audits/RUN-UI-1N-A-responsive-architecture-implementation-map.md`
- Read: `frontend/src/Dashboard.jsx`
- Read: `frontend/src/RunnerDashboard.jsx`
- Read: `frontend/src/components/requester/`
- Read: `frontend/src/components/runner/`
- Read: `frontend/src/components/ui/`
- Read: `frontend/src/App.css`, `frontend/src/index.css`, `frontend/src/styles/tokens.css`, `frontend/src/requester-run-form.css`, and role CSS files
- Test: no automated source test; audit completeness and repository diff checks

**Interfaces:**
- Consumes: approved design spec and the current committed component/style tree.
- Produces: a checked-in map naming the exact selectors/components, current breakpoint owners, navigation destinations, overflow/obstruction risks, accessibility gaps, resilience-state gaps, and the candidate files permitted to Tasks 2–4.

- [ ] Step 1: Read the approved spec from `HEAD` and record its immutable mobile-first, role, contract, width, state, accessibility, and safety requirements in the audit's scope.
- [ ] Step 2: Trace `Dashboard.jsx` into `RequesterMobileShell`, requester lists/overview components, form styles, navigation, loading/error paths, and state ownership; record selectors and existing breakpoint rules without proposing new API fields.
- [ ] Step 3: Trace `RunnerDashboard.jsx` into the active/available run sections, extracted runner components, fixed mobile navigation, inline mobile rules, loading/error/offline paths, receipt/proof presentation, and action handlers; record the existing `RunnerDashboard.mobile-layout.test.js` contract.
- [ ] Step 4: Trace shared UI primitives and global CSS for button semantics, focus behavior, min-widths, overflow, viewport units, safe-area padding, and motion preferences.
- [ ] Step 5: Build a table mapping each approved width (360, 390, 430, 768, 1024, 1440) to the intended fluid behavior and to the exact selectors under test; explicitly distinguish responsive defects from missing product capability.
- [ ] Step 6: Record only implementation files proven by the preceding inspection, including why each file changes and which later task owns it.
- [ ] Step 7: Review the audit for credentials, tokens, delivery secrets, receipt references, provider values, and unsupported implementation claims; remove any such content before saving.
- [ ] Step 8: Run `git diff --check` and review the audit-only diff; commit only the audit path with subject `Map RUN-UI-1N responsive architecture`.

### Task 2: Shared responsive foundation

**Checkpoint:** RUN-UI-1N-B

**Files:**
- Modify: `frontend/src/App.css: #root and mobile root containment rules`
- Modify: `frontend/src/index.css: root, body, and reduced-motion rules`
- Modify: `frontend/src/styles/tokens.css: existing design-token layer only when a token is the proven owner`
- Create: `frontend/src/responsive-foundation.test.js`
- Test: `frontend/src/responsive-foundation.test.js`, `frontend/src/RunnerDashboard.mobile-layout.test.js`

**Interfaces:**
- Consumes: Task 1's exact selector map and the existing `#root`, body, token, and R7B mobile shell contracts.
- Produces: shared CSS custom properties and layout invariants for min-width, max-width, gutters, safe-area clearance, overflow containment, focus visibility, and reduced motion that Requester and Runner role styles can consume without changing component state or API contracts.

- [ ] Step 1: Write the failing SSR/style contract test that loads the committed CSS through the existing Vite test pattern and asserts fluid representatives rather than six device branches: a 100% width floor, a bounded desktop frame, non-negative gutters, safe-area-aware bottom clearance, and no horizontal overflow rule.
- [ ] Step 2: Run `node --test src/responsive-foundation.test.js` from `frontend`; record RED caused by the missing shared contract.
- [ ] Step 3: Add only the shared custom properties and root rules proven by Task 1. Keep `#root` and body narrow-screen containment, preserve existing R7B shell clearance, retain reduced-motion behavior, and use `clamp()`/`minmax()` or equivalent fluid CSS instead of width-specific applications.
- [ ] Step 4: Run `node --test src/responsive-foundation.test.js`; verify GREEN and inspect generated markup/style text for the intended selectors.
- [ ] Step 5: Run `node --test src/RunnerDashboard.mobile-layout.test.js` and verify the protected Runner clearance regression remains GREEN.
- [ ] Step 6: Run `npm run lint` and `npm run build` from `frontend`; if Vite/esbuild emits the known Windows sandbox `spawn EPERM`, rerun the identical command with the approved narrow elevation and do not change source for the environment failure.
- [ ] Step 7: Run `git diff --check`, inspect the exact foundation diff, and confirm no Requester/Runner lifecycle/API/provider code changed.
- [ ] Step 8: Stage only the Task 2 paths and commit `Establish RUN-UI-1N responsive foundation`.

### Task 3: Requester responsive hardening

**Checkpoint:** RUN-UI-1N-C

**Files:**
- Modify: `frontend/src/Dashboard.jsx: existing loading/error ownership and semantic shell integration only`
- Modify: `frontend/src/components/requester/RequesterMobileShell.css: mobile shell, fixed nav clearance, disclosures, states, wrapping, and focus`
- Modify: `frontend/src/components/requester/RequesterCommandCenter.css: list/detail and wider-layout hierarchy`
- Modify: `frontend/src/components/requester/RequesterDashboardPolish.css: existing responsive polish rules`
- Modify: `frontend/src/requester-run-form.css: form grid, paired fields, errors, wrapping, and action clearance`
- Create: `frontend/src/requester-responsive.test.js`
- Test: `frontend/src/requester-responsive.test.js`, existing R3C Stripe test, and Task 2 foundation test

**Interfaces:**
- Consumes: Task 2 shared layout tokens/rules, `Dashboard.jsx`'s existing `activeRuns`, `completedRuns`, `loading`, and notification ownership, and `RequesterMobileShell`'s existing props/callbacks.
- Produces: responsive Requester Home, Request, My Runs, and Menu markup that preserves existing callbacks, state ownership, payload/value conversion, progressive disclosure, and navigation destinations at every representative width.

- [ ] Step 1: Write focused SSR tests for Home with active/no-active/history states, Request form labels and grouped fields, My Runs Active/History counts and selected detail disclosure, Menu navigation, and the absence of duplicate legacy detail presentation. Assert long location/item/instruction text wraps inside the shell.
- [ ] Step 2: Run `node --test src/requester-responsive.test.js` and verify RED for each missing contract assertion.
- [ ] Step 3: Implement the smallest CSS/markup changes: keep compact mobile stacking; introduce paired fields only above the width proven by Task 1; keep funding/protection next to Create Run; keep Smart Handoff in a disclosure; preserve `RequesterMobileShell` callbacks and existing `Dashboard.jsx` conversions; reserve fixed-nav safe-area space.
- [ ] Step 4: Add explicit loading, no-active, no-history, temporary-error, recovery, and busy-state text/semantics using existing state variables. Disable duplicate submission controls while their existing callbacks are busy; do not add lifecycle calls.
- [ ] Step 5: Ensure semantic labels, associated error text, `aria-current`/navigation semantics, visible focus, usable touch targets, non-color-only statuses, and reduced-motion compatibility in the touched controls.
- [ ] Step 6: Run `node --test src/requester-responsive.test.js`; verify GREEN, then run `node --test src/RunnerDashboard.mobile-layout.test.js` and `node --test src/responsive-foundation.test.js`.
- [ ] Step 7: Run `npm run lint`, `npm run build`, and `git diff --check` from `frontend`; review that no API, lifecycle, payment, provider, or schema file changed.
- [ ] Step 8: Stage only Task 3 paths and commit `Harden RUN-UI-1N Requester responsive experience`.

### Task 4: Runner responsive hardening

**Checkpoint:** RUN-UI-1N-D

**Files:**
- Modify: `frontend/src/RunnerDashboard.jsx: shell sizing, state messaging, active/available hierarchy, action semantics, and fixed-nav clearance`
- Modify: `frontend/src/components/runner/RunnerCommandCenter.css`
- Modify: `frontend/src/components/runner/RunnerCommandCenter.jsx: role navigation and command-center ordering`
- Modify: `frontend/src/components/runner/RunnerFocusedRunSection.jsx: active-run action and Smart Handoff presentation`
- Modify: `frontend/src/components/runner/RunnerActionStatusPanel.jsx: status, busy, and error semantics`
- Modify: `frontend/src/components/runner/RunnerOverviewHeader.jsx: payout/location hierarchy`
- Modify: `frontend/src/components/runner/RunnerRunCard.jsx: available-run card wrapping and action semantics`
- Modify: `frontend/src/components/runner/RunnerStatusSummary.jsx: offline/waiting state semantics`
- Modify: `frontend/src/components/runner/RunnerTrustChecklistSection.jsx: handoff and identity guidance wrapping`
- Create: `frontend/src/runner-responsive.test.js`
- Test: `frontend/src/runner-responsive.test.js`, `frontend/src/RunnerDashboard.mobile-layout.test.js`, and Task 2 foundation test

**Interfaces:**
- Consumes: Task 2 shared layout rules, Task 1's Runner selector map, existing `RunnerDashboard` state/handlers, `deriveRunnerCommandData`, and extracted runner component props.
- Produces: operational Runner Home, Earnings, Activity, and Menu presentation with available/active work priority, unobstructed next actions, contextual Smart Handoff, and resilient state semantics without adding backend capability.

- [ ] Step 1: Write SSR tests for offline, waiting-for-work, loading, temporary-error/recovery, available-run, and active-run states. Assert payout/location/next-action prominence, Smart Handoff context, receipt/proof section ordering, fixed-nav clearance, semantic navigation, and long content wrapping.
- [ ] Step 2: Run `node --test src/runner-responsive.test.js` and verify RED for the intended missing assertions.
- [ ] Step 3: Apply the minimum layout changes in the mapped Runner files: preserve compact mobile cards and fixed bottom nav; use additional columns only where Task 1's hierarchy map proves they remain clear; retain the R7B `height: auto !important`, viewport floor, and safe-area clearance contract.
- [ ] Step 4: Keep Home's available/active run ahead of secondary Earnings/Activity/Menu surfaces. Preserve the existing `markArrived`, receipt-proof, delivery-confirmation, and completion handlers and their busy guards; do not add a Start or provider call.
- [ ] Step 5: Make offline/waiting/active/loading/error/recovery/submission states explicit, keep primary actions keyboard-operable with visible focus, associate labels/errors, preserve non-color status communication, and keep filenames/identifiers wrapped or advanced.
- [ ] Step 6: Run `node --test src/runner-responsive.test.js`, then `node --test src/RunnerDashboard.mobile-layout.test.js` and `node --test src/responsive-foundation.test.js`; verify GREEN.
- [ ] Step 7: Run `npm run lint`, `npm run build`, and `git diff --check`; review that no backend, API, lifecycle, payment, provider, schema, or Requester source changed.
- [ ] Step 8: Stage only Task 4 paths and commit `Harden RUN-UI-1N Runner responsive experience`.

### Task 5: Cross-device validation

**Checkpoint:** RUN-UI-1N-E

**Files:**
- Modify: none unless a bounded defect correction is separately scoped from the failing check
- Test: `frontend/src/responsive-foundation.test.js`, `frontend/src/requester-responsive.test.js`, `frontend/src/runner-responsive.test.js`, and `frontend/src/RunnerDashboard.mobile-layout.test.js`

**Interfaces:**
- Consumes: Task 2–4 layout/state contracts and the committed RUN-UI-1M audit evidence.
- Produces: a reviewable validation record for both roles at 360, 390, 430, 768, 1024, and 1440, including protected 390 x 844 browser evidence.

- [ ] Step 1: Run all focused tests from `frontend` and record the exact pass counts; retain the existing Stripe initialization test in the final regression set.
- [ ] Step 2: Run the existing `npm run lint`, `npm run build`, and `git diff --check` gates before browser checks.
- [ ] Step 3: Use bounded manual browser validation because the repository exposes no browser automation framework: inspect Requester and Runner at each representative width, with 390 x 844 as a mandatory repeat of the RUN-UI-1M baseline.
- [ ] Step 4: At every applicable width verify no horizontal overflow, fixed-nav obstruction, missing/duplicated primary action, duplicated legacy UI, clipped card/form, broken long-content wrapping, or incoherent loading/empty/error/recovery/busy state.
- [ ] Step 5: Verify keyboard tab order, visible focus, keyboard navigation/actions, semantic labels, error association, and touch-target usability on both roles; record defects by exact selector and viewport.
- [ ] Step 6: If a defect appears, stop the validation batch, create a bounded correction task with a failing regression, retest the affected width and the 390 x 844 baseline, and do not waive the defect.
- [ ] Step 7: Review the validation evidence for API, lifecycle, authentication, Secure Hold, payment, Smart Handoff, schema, and provider drift; any suspected drift stops the milestone for separate authorization.

### Task 6: Closure and contract-drift gate

**Checkpoint:** RUN-UI-1N-F

**Files:**
- Modify: none for implementation; use the existing audit and repository history
- Test: all focused tests from Tasks 2–5, `frontend/src/lib/stripeInitialization.test.js`, lint, build, and repository checks

**Interfaces:**
- Consumes: the task commits, cross-device evidence, approved design spec, and frozen RUN-UI-1M contracts.
- Produces: a final exact-scope verification record and a commit/push decision; deployment remains outside this milestone.

- [ ] Step 1: Run `node --test src/lib/stripeInitialization.test.js`, `node --test src/responsive-foundation.test.js`, `node --test src/requester-responsive.test.js`, `node --test src/runner-responsive.test.js`, and `node --test src/RunnerDashboard.mobile-layout.test.js` from `frontend`.
- [ ] Step 2: Run `npm run lint`, `npm run build`, and `git diff --check`; use only the approved identical elevated retry for a known Windows/esbuild sandbox process-spawn failure.
- [ ] Step 3: Inspect the complete diff and perform a contract-drift audit covering API routes and request payloads, lifecycle transitions, authentication, Secure Hold, payment semantics, receipt proof, delivery confirmation, Smart Handoff backend semantics, Prisma schema, and provider integrations. A discovered drift blocks closure and requires separate authorization.
- [ ] Step 4: Perform a sensitive-data scan of added content without printing values; require no credentials, JWTs, delivery secrets, receipt references, database passwords, provider keys, generated images, environment files, or runtime artifacts.
- [ ] Step 5: Verify exact task scope and that only approved source/style/test/audit files are candidates. Exclude local env files, credentials, database data, browser state, temporary files, `node_modules`, and generated build output.
- [ ] Step 6: Stage exact paths only for the bounded closure unit under review, create a focused commit, and verify its subject, file set, clean index, and clean worktree. Do not use wildcard staging or amend.
- [ ] Step 7: Push only after a separately authorized push gate; verify remote ancestry and commit subject. Do not deploy.

## Testing Strategy

Use Node's built-in `node:test` as the repository's existing test runner. Component markup contracts load the real JSX through Vite SSR, as `RunnerDashboard.mobile-layout.test.js` already does; CSS-only contracts inspect emitted style text and representative invariants rather than inventing a browser framework. No browser automation package is present, so Task 5 uses bounded manual browser checks at 360, 390, 430, 768, 1024, and 1440. Every code task starts with a focused failing assertion, proves RED, makes one minimal change, proves GREEN, runs nearby regressions, runs lint/build/diff checks, and commits exact paths.

## Completion Criteria

The milestone is complete only when Tasks 1–6 have reviewable evidence, Requester and Runner pass the representative-width and protected 390 x 844 checks, resilience/accessibility/long-content gates pass, no contract drift is found, sensitive-data review passes, and the authorized closure commit/push gates are complete. No deployment is implied.
