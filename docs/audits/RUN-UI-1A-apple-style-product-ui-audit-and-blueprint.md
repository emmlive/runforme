# RUN UI-1A — Apple-Style Product UI Audit and RUNFORME Design Blueprint

Date: 2026-07-04 20:50:10 -05:00

## Release Baseline

- Repository: emmlive/runforme
- Branch: main
- Baseline commit: bf9cf5a
- Baseline subject: Record RUNFORME UI design blueprint
- Production backend: https://runforme-backend.onrender.com
- Production frontend: https://runforme-frontend.onrender.com

## Decision

The production release is functionally live, but UI design is not complete.

RUNFORME now needs a dedicated product design system and screen-by-screen premium redesign. The current UI is a functional MVP dashboard. It proved that the backend, frontend, database, security flow, and run lifecycle work in production, but it does not yet feel like a polished consumer-grade or Apple-style product.

## UI Inventory

| File | Lines | Inline Style Count | Button Count | Form/Input Count | Alert Count |
|---|---:|---:|---:|---:|---:|
| frontend/src/App.jsx | 165 | 1 | 0 | 0 | 1 |
| frontend/src/Login.jsx | 96 | 1 | 1 | 3 | 2 |
| frontend/src/Dashboard.jsx | 1231 | 109 | 6 | 6 | 0 |
| frontend/src/RunnerDashboard.jsx | 1005 | 45 | 6 | 3 | 0 |
| frontend/src/AdminDisputes.jsx | 115 | 5 | 3 | 0 | 4 |
| frontend/src/AdminGovernance.jsx | 170 | 14 | 5 | 0 | 3 |
| frontend/src/components/LiveMap.jsx | 197 | 12 | 0 | 0 | 0 |
| frontend/src/components/PaymentModal.jsx | 157 | 4 | 1 | 0 | 9 |

## Current Product Strengths

- Requester and runner flows are functional in production.
- Role-based dashboards exist.
- Live run lifecycle is working end-to-end.
- Secure Hold placeholder flow is visible.
- Receipt proof, delivery PIN, manual review state, and completion state are visible.
- Production CORS, auth protection, and deployed API routing are working.
- Google Maps broken panel has been replaced by a graceful map fallback.

## Current UI Gaps

### 1. Visual Identity

Current issue:
- The UI works but does not yet feel premium, native, or iconic.
- Visual hierarchy is inconsistent.
- The dashboard feels like a development/admin tool rather than a polished app.

Target:
- Apple-style restraint, spacing, softness, hierarchy, and motion.
- RUNFORME-specific mission/trust language.
- A recognizable live-run experience.

### 2. Requester Experience

Current issue:
- Create Run and Run Detail are functional but not yet a guided premium experience.
- Requester should feel protected, informed, and in control.

Target:
- Requester Command Center.
- Guided create-run flow.
- Trust-first secure hold card.
- Clear run status timeline.
- Live mission card for active run.
- Human-readable payment/hold language.
- Better completed-run receipt summary.

### 3. Runner Experience

Current issue:
- Runner dashboard works, but it should feel like a focused mission cockpit.
- The active job actions need stronger hierarchy and reduced cognitive load.

Target:
- Runner Mission Control.
- Online/offline as a prominent status switch.
- Available Runs as polished mission cards.
- Accepted run as a live action sequence.
- One primary action at a time.
- Safety checkpoint progress: Accept → Arrived → Start → Receipt → Delivery → Complete.
- Better payout, spend limit, receipt, and delivery PIN presentation.

### 4. Trust and Safety UI

Current issue:
- The safety system exists, but the UI does not fully communicate its value.

Target:
- Trust Layer as a product differentiator.
- Secure Hold, Receipt Proof, Delivery PIN, Manual Review, and Completion Safety should feel like premium safety checkpoints.
- Replace technical labels with clear user-facing trust copy.
- Add visual checkpoint states.

### 5. Mobile-First Layout

Current issue:
- Layout is desktop-usable, but the product should be designed mobile-first.

Target:
- Thumb-friendly actions.
- Sticky bottom action area on mobile.
- Larger tap targets.
- Drawer-based detail views.
- Less scrolling fatigue.
- Native app feel even in web deployment.

### 6. Design System Missing

Current issue:
- Styling is spread across large JSX files with many inline style blocks.
- Reusable primitives are limited.

Target:
- Shared design tokens.
- Shared Button, Card, Badge, EmptyState, StatusPill, MissionCard, TrustCheckpoint, ActionBar, and Drawer components.
- Consistent typography, spacing, radius, shadows, border treatment, and animation.

## RUNFORME Design Principles

1. Mission-first — every run should feel like a live mission with a clear next step.
2. Trust-forward — payment, receipt, delivery, and completion safety are core product value.
3. Apple-style restraint — reduce clutter with clean spacing, soft depth, calm motion, and clear hierarchy.
4. One primary action — especially for runners, show one obvious next step instead of many equal-weight buttons.
5. Status is visual — use timelines, badges, checkpoints, and cards instead of dense text.
6. Fast confidence — users should understand what is happening in two seconds.
7. Premium but practical — high-end design must still support real errands, deliveries, pickups, and service runs.

## Apple-Style Baseline

### Typography

- Display: 32–40px
- Page title: 26–32px
- Section title: 18–22px
- Body: 15–16px
- Metadata: 12–13px
- Button: 15–16px semibold

### Spacing

- 4px micro
- 8px small
- 12px compact
- 16px standard
- 20px section
- 24px large
- 32px page
- 48px hero

### Shape

- Cards: 20–28px radius
- Buttons: 14–18px radius
- Pills: 999px radius
- Inputs: 14–16px radius
- Drawers/modals: 24–32px radius

### Depth

- Soft shadow only where hierarchy matters.
- Prefer subtle border plus translucent background.
- Avoid heavy box shadows.

### Motion

- Smooth state transitions.
- Button pressed states.
- Card hover/active states.
- Toast entrance/exit.
- Drawer slide/fade.
- Status checkpoint progress.

## RUNFORME Visual Language

### Core Surfaces

- Mission Card
- Trust Card
- Secure Hold Card
- Live Status Timeline
- Runner Action Panel
- Requester Command Center
- Completion Summary
- Safety Review Panel

### Suggested Color Roles

- Base: white / off-white / slate
- Primary: deep blue or near-black premium action
- Success: green
- Warning: amber
- Danger: red
- Trust/Security: blue
- Neutral metadata: slate

### Icon Language

- Shield: secure hold / safety
- Receipt: proof
- Pin: delivery PIN
- Route/arrow: runner movement
- Check: completed step
- Clock: waiting
- Alert triangle: manual review
- Wallet/card: payment

## Screen Architecture Target

### Requester Command Center

1. Header
   - Greeting / role
   - Current run state
   - Create Run CTA

2. Create Run
   - Guided fields
   - Budget explanation
   - Secure hold explanation
   - Simple vs purchase-budget mode

3. Active Mission
   - One live card per active run
   - Status timeline
   - Runner assignment
   - Secure hold state
   - Receipt state
   - Delivery PIN
   - Manual review state

4. Completed Runs
   - Clean history cards
   - Final amount / status / completion time

### Runner Mission Control

1. Status Switch
   - Online/offline
   - Trust/safety note

2. Available Missions
   - Mission cards
   - Payout
   - Max spend
   - Secure hold state
   - Accept CTA

3. Active Mission
   - One next action at a time
   - Status timeline
   - Receipt proof
   - Delivery confirmation
   - Completion

4. Earnings/Safety Summary
   - Payout ready
   - Spend limit
   - Review required status

## Component Roadmap

### RUN UI-1B — Design Tokens and Primitives

Create:

- frontend/src/styles/tokens.css
- frontend/src/components/ui/Button.jsx
- frontend/src/components/ui/Card.jsx
- frontend/src/components/ui/StatusPill.jsx
- frontend/src/components/ui/TrustBadge.jsx
- frontend/src/components/ui/EmptyState.jsx
- frontend/src/components/ui/SectionHeader.jsx
- frontend/src/components/ui/ActionBar.jsx

No business logic changes.

### RUN UI-1C — Requester Dashboard Redesign

Target:
- Redesign requester dashboard around Command Center.
- Preserve API calls and socket behavior.
- Preserve secure hold, create run, active/completed run behavior.

### RUN UI-1D — Runner Dashboard Redesign

Target:
- Redesign runner dashboard around Mission Control.
- Preserve runner online, location update, accept, arrived, receipt, delivery PIN, complete behavior.

### RUN UI-1E — Run Detail / Mission Card

Target:
- Extract and polish Run Detail into reusable Mission Card.
- Stronger trust/safety timeline.

### RUN UI-1F — Create Run Flow

Target:
- Convert simple form into guided create-run experience.
- Add beginner-friendly copy and safer budget explanation.

### RUN UI-1G — Motion and Interaction Polish

Target:
- Loading skeletons.
- Toasts.
- Button pending states.
- Transition polish.
- Empty states.

## Non-Goals for UI Phase 1

- No payment provider mutation.
- No Stripe live capture.
- No schema migration unless separately approved.
- No route behavior changes unless required by UI.
- No breaking production smoke flow.
- No mobile native rebuild yet.

## Regression Gates for Every UI Patch

Every UI patch must pass:

- npm run lint
- npm run build
- backend syntax checks for key files
- no direct frontend hardcoded production-blocking localhost calls
- no sensitive token/debug logs
- requester login still works
- runner login still works
- requester dashboard still loads
- runner dashboard still loads
- runner online still works
- create run still works
- accept/arrived/receipt/delivery/complete still work
- secure hold gate remains intact
- production smoke route checks remain intact before deploy

## Recommended Next Step

Proceed to RUN UI-1B — Build shared Apple-style design tokens and primitive components.

This should be a small scoped component foundation patch with no dashboard redesign yet.
