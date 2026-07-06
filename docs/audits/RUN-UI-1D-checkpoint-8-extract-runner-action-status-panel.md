# RUN UI-1D Checkpoint 8 - Extract Runner Action Status Panel

Base commit: `22a4128` - Extract runner overview header

## Scope

Checkpoint 8 extracts the runner command center action/status presentation into a dedicated presentational component.

Changed files:

- `frontend/src/components/runner/RunnerCommandCenter.jsx`
- `frontend/src/components/runner/RunnerActionStatusPanel.jsx`
- `frontend/src/components/runner/index.js`
- `docs/audits/RUN-UI-1D-checkpoint-8-extract-runner-action-status-panel.md`

## Implementation

This checkpoint adds:

- `RunnerActionStatusPanel`

`RunnerCommandCenter` now delegates status label and metrics presentation to `RunnerActionStatusPanel`.

`RunnerActionStatusPanel` composes the existing `RunnerStatusSummary` presentational component.

`RunnerDashboard.jsx` remains unchanged. Existing runner state, effects, event handlers, route strings, and action handlers remain owned by `RunnerDashboard.jsx`.

## Behavior Preservation

RunnerDashboard behavior-sensitive anchor counts were captured before and after extraction and stayed unchanged.

Protected Dashboard, RunnerDashboard, runner helper, CSS, overview header, card, status summary, and checklist files were hash-guarded and remained unchanged.

Changed runner presentation files were scanned for blocked behavior anchors.

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
- latest clean base confirmed at `22a4128`
- RUN UI-1D Checkpoint 1 through 7 audit artifacts confirmed
- Checkpoint 8 anchor guard
- RunnerDashboard behavior anchor guard
- protected file hash guard
- changed-file scope guard
- changed presentation files blocker scan
- frontend lint
- frontend build
- backend Node syntax checks
- clean `git diff --check`

## Recent Git Log

``text
22a4128 Extract runner overview header
3df5ba7 Fix runner command data lint
84692b5 Extract runner command data helper
0c97c19 Refine runner command center layout placement
fbc9ff1 Clean runner command center whitespace
d683976 Pass runner command center display data
6537239 Wire runner command center preview
81b5a2a Add runner command center presentation components
``

## Checkpoint 8 Rescue Note

The RunnerStatusSummary import style was verified against the existing RunnerStatusSummary export before final validation.
