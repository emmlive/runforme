# RUN UI-1I - Receipt Photo Upload UX Current-State Audit

- Step: RUN UI-1I
- Checkpoint: 1
- Scope: Audit current runner receipt proof URL flow and plan real receipt photo upload UX
- Time: 2026-07-14 13:22:15 -05:00
- Starting commit: c2f00a3
- Source behavior changed: NO
- Backend behavior changed: NO
- Database schema changed: NO
- Deploy performed: NO

## Result

PASS.

The current production runner receipt proof flow still uses a URL-style proof input instead of a real in-app photo upload UX.

## Why This Checkpoint Exists

During RUN UI-1H production smoke, the runner had to use the receipt proof URL field. Product-wise, the runner should not need to manually find or paste a URL during a run.

The target RUN UI-1I product flow is:

1. Runner buys the item.
2. Runner takes or selects a receipt photo inside RUNFORME.
3. RUNFORME uploads or stores the image through a controlled backend path.
4. Backend records the generated receipt proof reference automatically.
5. Requester sees receipt proof status and review information in Run Detail.
6. Manual review still triggers when receipt amount exceeds max runner spend or other existing rules require review.

## Current-State Findings

- Runner URL/proof field references found: 2
- Runner file upload references found: 0
- Backend upload middleware references found: 0
- Backend receipt-proof endpoint references found: 0
- Requester receipt/review references found: 11
- Prisma receipt/manual review field references found: 5

## Audit Slices

- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/01-frontend-receipt-proof-search.md
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/02-backend-receipt-proof-search.md
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/03-prisma-receipt-proof-search.md
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/04-runner-receipt-proof-window.md
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/05-requester-receipt-proof-window.md
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/06-backend-receipt-proof-window.md

## Proposed RUN UI-1I Implementation Plan

Checkpoint 2 - Runner photo upload UI foundation:

- Replace the confusing Receipt proof URL input with receipt photo upload controls.
- Add clear helper copy: take or upload a receipt photo after purchase.
- Show selected file name / preview state before submission.
- Preserve receipt amount field and Submit Receipt Proof action semantics.

Checkpoint 3 - Backend upload handling decision:

- Decide whether this checkpoint should use multipart upload storage, base64 placeholder storage, or a temporary demo-safe local/prod-compatible placeholder.
- Keep production safety strict: no uncontrolled public file writes, no raw dangerous paths, no unauthenticated upload route.

Checkpoint 4 - Requester proof preview/review polish:

- Make requester Run Detail clearly show receipt proof uploaded / review required / approved status.
- Add image/proof preview only after backend proof reference exists.

Checkpoint 5 - Full production smoke and closeout:

- Verify requester create run, secure hold, runner accept, arrival, receipt photo proof, delivery PIN, manual review if triggered, and completion.

## Guardrails

- Do not break existing receipt-proof endpoint behavior.
- Do not remove manual review protection.
- Do not weaken max runner spend validation.
- Do not deploy without explicit production verification request.
- Keep checkpoint patches small and reversible.

## Validation Gates

- frontend npm run lint: PASS
- frontend npm run build: PASS
- backend node --check src/server.js: PASS
- backend node --check src/app.js: PASS

## Next Checkpoint

RUN UI-1I Checkpoint 2 should implement the runner-side receipt photo upload UX foundation while preserving the existing API contract as much as possible.
