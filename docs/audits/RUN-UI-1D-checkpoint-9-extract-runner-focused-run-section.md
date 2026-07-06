# RUN UI-1D Checkpoint 9 - Extract Runner Focused Run Section

Base commit: `b186f26` - Extract runner action status panel

## Scope

Checkpoint 9 extracts the runner command center focused run card presentation into a dedicated presentational component.

Changed files:

- `frontend/src/components/runner/RunnerCommandCenter.jsx`
- `frontend/src/components/runner/RunnerFocusedRunSection.jsx`
- `frontend/src/components/runner/index.js`
- `docs/audits/RUN-UI-1D-checkpoint-9-extract-runner-focused-run-section.md`

## Implementation

This checkpoint adds:

- `RunnerFocusedRunSection`

`RunnerCommandCenter` now delegates focused run card presentation to `RunnerFocusedRunSection`.

`RunnerFocusedRunSection` composes the existing `RunnerRunCard` presentational component and matches its export/import style.

`RunnerDashboard.jsx` remains unchanged. Existing runner state, effects, event handlers, route strings, and action handlers remain owned by `RunnerDashboard.jsx`.

## Behavior Preservation

RunnerDashboard behavior-sensitive anchor counts were captured before and after extraction and stayed unchanged.

Protected Dashboard, RunnerDashboard, runner helper, CSS, overview header, action/status panel, card, status summary, and checklist files were hash-guarded and remained unchanged.

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
- latest clean base confirmed at `b186f26`
- RUN UI-1D Checkpoint 1 through 8 audit artifacts confirmed
- Checkpoint 9 anchor guard
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
b186f26 Extract runner action status panel
22a4128 Extract runner overview header
3df5ba7 Fix runner command data lint
84692b5 Extract runner command data helper
0c97c19 Refine runner command center layout placement
fbc9ff1 Clean runner command center whitespace
d683976 Pass runner command center display data
6537239 Wire runner command center preview
``
