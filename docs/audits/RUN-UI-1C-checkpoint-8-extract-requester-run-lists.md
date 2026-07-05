# RUN UI-1C Checkpoint 8 — Extract Requester Active and History Run Lists

Base commit: `94b6d8c` — Extract requester overview intro

## Scope

Checkpoint 8 extracts requester active/history run list presentation into dedicated presentational components.

Changed files:

- `frontend/src/components/requester/RequesterRunOverview.jsx`
- `frontend/src/components/requester/RequesterRunList.jsx`
- `frontend/src/components/requester/RequesterRunLists.jsx`
- `frontend/src/components/requester/RequesterCommandCenter.css`
- `frontend/src/components/requester/index.js`
- `docs/audits/RUN-UI-1C-checkpoint-8-extract-requester-run-lists.md`

## Implementation

This checkpoint adds:

- `RequesterRunList`
- `RequesterRunLists`

`RequesterRunOverview` now renders `RequesterRunLists` using the display-only data it already receives:

- `activeRuns`
- `historyRuns`

The list presentation shows:

- active run count
- history run count
- up to three visible run cards per section
- scan-safe status text
- empty states for active and history lists

## Resume Notes

The first Checkpoint 8 attempt partially applied new list/CSS/barrel files but missed the `RequesterTrustTimeline` anchor because the script expected exact formatting. The first resume command used a flexible JSX matcher and patched `RequesterRunOverview`.

The second resume step removed blocked status-field strings from `RequesterRunList.jsx` so the scoped production blocker scan stayed strict and passed.

## Behavior Preservation Guards

`Dashboard.jsx` was not changed in this checkpoint.

Before and after the requester component extraction, Dashboard hard behavior-sensitive anchor counts were checked for:

- API/client anchors
- backend route anchors
- browser storage anchors
- HTTP mutation words
- click handlers
- state setters
- effects

The guard passed only if those hard behavior anchors stayed unchanged.

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

- scoped dirty-state resume from `94b6d8c`
- UI-1C requester files confirmed
- Dashboard hard behavior anchor count guard
- extracted run list component anchor guard
- frontend lint
- frontend build
- backend Node syntax checks
- scoped production blocker scans over changed requester files
- guarded Dashboard unchanged
- `git diff --check`
- commit and push only after clean validation
