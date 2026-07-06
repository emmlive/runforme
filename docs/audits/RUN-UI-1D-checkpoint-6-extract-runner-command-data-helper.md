# RUN UI-1D Checkpoint 6 - Extract Runner Command Data Helper

Base commit: `0c97c19` - Refine runner command center layout placement

## Scope

Checkpoint 6 extracts the runner command center live display-data derivation into a pure helper.

Changed files:

- `frontend/src/RunnerDashboard.jsx`
- `frontend/src/components/runner/deriveRunnerCommandData.js`
- `frontend/src/components/runner/index.js`
- `docs/audits/RUN-UI-1D-checkpoint-6-extract-runner-command-data-helper.md`

## Implementation

This checkpoint adds:

- `deriveRunnerCommandData`

The helper derives the same display-only values previously built inline in `RunnerDashboard.jsx`:

- available run count
- focused run presence
- completed run count
- status label
- checklist copy

`RunnerDashboard.jsx` still owns the existing runner state, routes, events, and action handlers. It now calls the helper and passes the returned display props into `RunnerCommandCenter`.

## Behavior Preservation

RunnerDashboard behavior-sensitive anchor counts were captured before and after extraction and stayed unchanged.

Protected runner component JSX/CSS files were hash-guarded and remained unchanged.

The helper and changed runner files were scanned for blocked behavior anchors.

## Explicit Non-Goals

This checkpoint does not:

- change backend routes
- change Prisma/database schema
- change payment behavior
- change runner online/offline behavior
- change available run loading
- change runner event handling
- change accept/start/arrived behavior
- change proof behavior
- change handoff/PIN behavior
- change completion behavior
- move action handlers into runner components
- deploy production

## Validation

Required validation:

- clean git status before start
- latest clean base confirmed at `0c97c19`
- RUN UI-1D Checkpoint 1 through 5 audit artifacts confirmed
- existing display/layout anchors preserved
- Checkpoint 6 helper anchor guard
- RunnerDashboard behavior anchor guard
- protected component/CSS hash guard
- changed-file scope guard
- helper blocker scan
- RunnerDashboard added-lines blocker scan
- barrel export guard
- frontend lint
- frontend build
- backend Node syntax checks
- clean `git diff --check`

## Recent Git Log

``text
0c97c19 Refine runner command center layout placement
fbc9ff1 Clean runner command center whitespace
d683976 Pass runner command center display data
6537239 Wire runner command center preview
81b5a2a Add runner command center presentation components
14ffde0 Audit runner command center current state
c27c75b Close requester command center redesign lane
bf4ac04 Polish requester command center visuals
``
