# RUN UI-1G Checkpoint 1 - Post-Smoke Remaining UI Gap Map

Base commit: `e049ede` - Record runner local visual smoke

## Scope

Checkpoint 1 opens the RUN UI-1G lane by mapping remaining legacy UI surfaces after the requester and runner command center work.

This checkpoint is audit-only. It does not change runtime source files.

## Current Product State

RUN UI-1F verified locally that:

- requester dashboard loads
- requester command center remains polished
- runner dashboard loads
- runner map fallback remains readable
- polished runner command center appears above Available Runs when no active run is selected
- Available Runs remains visible below the command center

## Remaining Visual Gap Map

The next UI work should focus on the remaining legacy surfaces around the new command centers:

### Runner Dashboard

- map fallback still reads like a standalone legacy card rather than a unified command surface
- Available Runs bottom sheet still uses dark legacy styling
- waiting/empty state should match the new Apple-style runner command center
- active-run controls should be visually grouped without moving behavior handlers
- delivery PIN, receipt proof, completion status, and action buttons should remain behavior-owned by `RunnerDashboard.jsx`

### Requester Dashboard

- Create Run form still has legacy form spacing and button treatment
- Active Runs and Completed Runs card areas need visual alignment with requester command center
- Run Detail dark panel is functional but should be refined carefully after behavior gates
- secure hold/payment/review panels should stay security-forward and behavior-preserving

### Live Map Fallback

- fallback copy is correct and should stay clear
- card treatment can be unified with the new command center design
- Google Maps paused state should continue to avoid blocking the run workflow

## Static Gap Signal Counts

### RunnerDashboard.jsx

``text
Available Runs => 1
MAP PREVIEW => 0
Location pending => 0
Map fallback active => 0
Waiting for jobs => 1
background:\s*"#111" => 2
background:\s*"#0b0b0b" => 3
borderTop:\s*"1px solid #222" => 2
style=\{\{ => 45
Complete Run => 1
Confirm Delivery PIN => 1
Receipt Proof => 1
Start Run => 0
Arrived => 3
``

### Dashboard.jsx

``text
Create Run => 2
Active Runs => 2
Completed Runs => 1
Run Detail => 0
Secure hold preview => 1
RUN DETAIL => 1
SECURITY & PROOF => 1
SECURE PAYMENT HOLD => 1
style=\{\{ => 109
background:\s*"#111827" => 1
background:\s*"#0f172a" => 1
``

### LiveMap.jsx

``text
MAP PREVIEW => 0
Location pending => 1
Map fallback active => 1
Coordinates unavailable => 1
Live Google Maps is paused => 1
style=\{\{ => 12
``

## Generated Source Slices

- `docs/audits/RUN-UI-1G-runner-gap-slices.txt`
- `docs/audits/RUN-UI-1G-requester-gap-slices.txt`
- `docs/audits/RUN-UI-1G-livemap-gap-slices.txt`

## Recommended Next Checkpoints

1. `RUN UI-1G Checkpoint 2` - runner shell and Available Runs visual polish, CSS/markup only, no API/socket/action-handler changes.
2. `RUN UI-1G Checkpoint 3` - LiveMap fallback card visual unification, no map behavior changes.
3. `RUN UI-1G Checkpoint 4` - requester Create Run and run-list card visual refinement, no create-run behavior changes.
4. `RUN UI-1G Checkpoint 5` - requester Run Detail panel polish, preserving all security/payment/manual-review controls.
5. `RUN UI-1G Checkpoint 6` - local visual smoke and regression closeout.

## Guardrails For UI-1G

- no backend route changes
- no Prisma/database schema changes
- no payment behavior changes
- no runner online/offline behavior changes
- no available-run loading changes
- no runner socket event changes
- no accept/start/arrived/proof/PIN/complete behavior changes
- no secure hold/manual review behavior changes
- no deploy unless explicitly requested

## Validation

Checkpoint 1 verified:

- clean git status before start
- latest clean base confirmed at `e049ede`
- UI-1F closeout artifact exists
- previous-lane anchors remain present
- static UI gap signals collected
- source slices generated for runner/requester/LiveMap targets
- runtime source hashes remained unchanged after writing audit artifacts
- changed-file scope stayed audit-only
- frontend lint passed
- frontend build passed
- backend Node syntax checks passed
- `git diff --check` passed

## Recent Git Log

``text
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
22a4128 Extract runner overview header
3df5ba7 Fix runner command data lint
84692b5 Extract runner command data helper
``
