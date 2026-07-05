# RUN UI-1C — Requester Command Center Redesign Map

Date: 2026-07-04 21:06:41 -05:00

## Baseline

- Repository: emmlive/runforme
- Branch: main
- Baseline commit: 9441792
- Baseline subject: Fix UI primitive lint validation

## Purpose

RUN UI-1C will redesign the requester dashboard into a premium Apple-style RUNFORME Command Center while preserving the current production requester behavior.

This checkpoint maps the existing dashboard before any UI code change.

## Current Dashboard Inventory

| Metric | Value |
|---|---:|
| File lines | 1231 |
| Inline style blocks | 109 |
| Button count | 6 |
| Input/select/textarea count | 6 |
| apiRequest calls | 0 |
| fetch calls | 4 |
| Socket references | 0 |
| Secure Hold anchors | 10 |
| Manual Review anchors | 5 |
| Delivery PIN anchors | 5 |

## UI-1B Foundation Available

- frontend\src\styles\tokens.css
- frontend\src\components\ui\Button.jsx
- frontend\src\components\ui\Card.jsx
- frontend\src\components\ui\StatusPill.jsx
- frontend\src\components\ui\TrustBadge.jsx
- frontend\src\components\ui\EmptyState.jsx
- frontend\src\components\ui\SectionHeader.jsx
- frontend\src\components\ui\ActionBar.jsx
- frontend\src\components\ui\TrustCheckpoint.jsx
- frontend\src\components\ui\MissionCard.jsx
- frontend\src\components\ui\Drawer.jsx
- frontend\src\components\ui\index.js

## Existing Behavior To Preserve

- Requester login and dashboard load
- Fetch requester runs
- Create a run
- Active Runs display
- Completed Runs display
- Run Detail panel
- Secure Hold placeholder authorization
- Authorization status display
- Payment status display
- Runner assignment display
- Receipt upload status display
- Manual Review approval action
- Delivery PIN / delivery confirmation display
- Socket-driven run updates
- Active to completed transition after completion

## Target Command Center Structure

### 1. Command Header

- Premium RUNFORME title area
- Requester role context
- Current activity summary
- Primary create-run action
- Trust badge

### 2. Mission Composer

- Keep existing create-run behavior
- Present form as guided mission setup
- Add trust copy explaining secure hold placeholder
- Better hierarchy for item, pickup/location, budget/spend settings

### 3. Active Mission Board

- Active run cards using MissionCard / Card / StatusPill
- One clear status per run
- Runner assignment and security state visible
- Run Detail opened through a premium drawer/card model in later checkpoint

### 4. Trust & Safety Layer

- Secure Hold checkpoint
- Receipt Proof checkpoint
- Delivery PIN checkpoint
- Manual Review checkpoint
- Completion checkpoint

### 5. Completed Mission History

- Clean completed run cards
- Final amount, status, and completion time
- Safer receipt/payment labels

## UI-1C Patch Strategy

### Checkpoint 2

Add requester-specific presentational helpers and CSS without changing behavior:

- frontend/src/components/requester/RequesterCommandCenter.css
- frontend/src/components/requester/RequesterMissionSummary.jsx
- frontend/src/components/requester/RequesterTrustTimeline.jsx

Wire only low-risk imports if needed.

### Checkpoint 3

Refactor Dashboard.jsx visual shell:

- Import UI primitives
- Wrap existing create-run form in Command Center shell
- Convert summary areas to Card / SectionHeader / StatusPill
- Preserve all state variables, handlers, API calls, and socket listeners

### Checkpoint 4

Refine Run Detail:

- Use MissionCard / TrustCheckpoint
- Keep existing secure hold/manual review actions unchanged

## Non-Goals

- No backend route changes
- No Prisma schema changes
- No payment provider mutation
- No Stripe live capture
- No socket behavior changes
- No admin redesign in this lane
- No runner redesign in this lane

## Required Regression Gates

Every UI-1C code checkpoint must pass:

- frontend npm run lint
- frontend npm run build
- backend syntax checks
- scoped production blocker scan
- requester dashboard behavior preserved
- create run preserved
- secure hold preserved
- manual review preserved
- completed run display preserved

## Generated Slices

Dashboard slices were generated under:

- docs/audits/RUN-UI-1C-dashboard-slices/

These slices support the next surgical patch.
