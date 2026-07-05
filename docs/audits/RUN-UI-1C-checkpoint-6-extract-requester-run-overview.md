# RUN UI-1C Checkpoint 6 — Extract Requester Run Overview Presentation

Base commit: `dc460f4` — Refine requester command center layout

## Scope

Checkpoint 6 begins extracting requester run sections from `Dashboard.jsx` into presentational components.

Changed files:

- `frontend/src/Dashboard.jsx`
- `frontend/src/components/requester/RequesterRunOverview.jsx`
- `frontend/src/components/requester/index.js`
- `docs/audits/RUN-UI-1C-checkpoint-6-extract-requester-run-overview.md`

## Implementation

This checkpoint extracts the existing requester Command Center / run overview JSX from `Dashboard.jsx` into:

- `RequesterRunOverview`

The extracted component remains presentational and receives the same display-only props that Checkpoint 4 and Checkpoint 5 already wired:

- `activeRun`
- `activeRuns`
- `historyRuns`
- `steps`

`Dashboard.jsx` now renders:

- `RequesterRunOverview`

The existing display-only derived requester data remains in `Dashboard.jsx` for now. Future checkpoints can move more derivation or run-list presentation in smaller guarded steps.

## Behavior Preservation Guards

This checkpoint did not add or change:

- API calls
- backend route strings
- browser storage usage
- HTTP mutation words
- click handlers
- state setters
- effects

Before and after the Dashboard extraction, hard behavior-sensitive anchor counts were checked and had to remain unchanged.

## Explicit Non-Goals

This checkpoint does not:

- change backend routes
- change Prisma/database schema
- change payment behavior
- change secure hold authorization behavior
- change manual review approval behavior
- change delivery PIN or delivery confirmation behavior
- change run creation behavior
- change run fetching behavior
- change runner acceptance behavior
- deploy production

## Validation

Required validation for this checkpoint:

- clean git status before start
- latest clean base confirmed
- UI-1B primitives confirmed
- UI-1C requester components confirmed
- Dashboard hard behavior anchor count guard
- requester overview component anchor guard
- frontend lint
- frontend build
- backend Node syntax checks
- scoped production blocker scans over added/changed requester and Dashboard lines
- `git diff --check`
- commit and push only after clean validation
