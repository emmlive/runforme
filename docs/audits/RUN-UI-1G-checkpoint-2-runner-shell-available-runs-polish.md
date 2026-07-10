# RUN UI-1G Checkpoint 2 - Runner Shell and Available Runs Visual Polish

Base commit: `5c7cee3` - Map post-smoke UI gaps

## Scope

Checkpoint 2 applies a small visual-only polish to the runner no-active-run shell around Available Runs.

Changed runtime files:

- `frontend/src/RunnerDashboard.jsx`
- `frontend/src/components/runner/RunnerCommandCenter.css`

Audit file:

- `docs/audits/RUN-UI-1G-checkpoint-2-runner-shell-available-runs-polish.md`

## What Changed

- added visual class names to the existing no-active-run Available Runs panel
- placed the JSX marker outside the conditional expression so lint parses cleanly
- preserved the existing inline style object and render condition
- added a `RUN-UI-1G-CHECKPOINT-2` CSS section for glass-style panel treatment
- aligned the empty/waiting state with the runner command center visual language
- kept the polished Runner Command Center above Available Runs

## Behavior Preservation

This checkpoint does not add API calls, sockets, storage reads/writes, lifecycle effects, or action handlers.

`RunnerDashboard.jsx` remains the owner of runner state, effects, sockets, route strings, and action handlers.

## Explicit Non-Goals

This checkpoint does not:

- change backend routes
- change Prisma/database schema
- change payment behavior
- change runner online/offline behavior
- change available-run loading
- change runner event handling
- change accept/start/arrived behavior
- change proof behavior
- change handoff/PIN behavior
- change completion behavior
- move action handlers into runner components
- deploy production

## Validation

Checkpoint 2 verified:

- clean git status after failed patch reset
- latest clean base confirmed at `5c7cee3`
- UI-1F and UI-1G Checkpoint 1 audit artifacts exist
- pre-patch runner shell anchors exist
- post-patch visual anchors exist
- protected source hashes stayed unchanged
- RunnerDashboard behavior-sensitive counts stayed unchanged
- added RunnerDashboard lines contain no behavior blockers
- added CSS lines contain no behavior blockers
- changed-file scope stayed limited to expected runtime/audit files
- frontend lint passed
- frontend build passed
- backend Node syntax checks passed
- `git diff --check` passed

## Recent Git Log

``text
5c7cee3 Map post-smoke UI gaps
e049ede Record runner local visual smoke
9e0f056 Show runner command center on base dashboard
2cf43bb Close runner command center visual polish lane
845fd97 Polish runner command center responsive layout
2c93b98 Polish runner status and metrics visuals
d00ba56 Polish runner card and checklist visuals
bb2ad57 Polish runner command center visuals
3a81859 Close runner command center extraction lane
91e8a85 Extract runner trust checklist section
3355fa8 Extract runner focused run section
b186f26 Extract runner action status panel
``
