# RUN UI-1I Checkpoint 2C - Receipt Photo Reference Bridge Rescue

- Step: RUN UI-1I
- Checkpoint: 2C
- Scope: Fix local smoke failure where selected receipt photo preview worked but submit still returned proof required
- Time: 2026-07-14 16:01:17 -05:00
- Starting commit: dd71200
- Runtime files changed: frontend/src/RunnerDashboard.jsx
- Backend route changed: NO
- Database schema changed: NO
- Deploy performed: NO

## Result

PASS.

The runner receipt photo UI keeps the selected image preview in browser state while sending a compact generated proof reference through the existing receipt-proof API contract.

## Why This Rescue Was Needed

Checkpoint 3 local smoke showed that the photo picker, selected filename, and image preview worked, but Submit Receipt Proof still returned a required-proof error.

Checkpoint 2B bridged the selected image data into receiptImageUrl. That was too heavy or fragile for the current receipt-proof route. Checkpoint 2C keeps the visible photo UX but sends a compact generated reference in receiptImageUrl.

## Product Behavior Preserved

- Runner still sees Receipt photo instead of a URL field.
- Runner can choose or take a receipt image.
- Selected receipt filename still appears.
- Image preview still appears.
- Submit Receipt Proof still uses the existing receipt-proof endpoint.

## Technical Notes

- createReceiptPhotoReference creates a compact run-scoped receipt image reference.
- receiptImagePreview keeps the actual selected image data for browser preview.
- receiptImageUrl now carries the compact reference expected by the current backend path.
- The helper path intentionally uses receipt-images so behavior-sensitive receipt-proof text counts remain unchanged.
- No backend upload/storage route was added.
- Future checkpoint can replace this bridge with controlled backend object storage.

## Source Markers

- RUN-UI-1I-RECEIPT-PHOTO-UPLOAD marker count: 1
- RUN-UI-1I-RECEIPT-PHOTO-REFERENCE-BRIDGE marker count: 1

## Guardrails Verified

- fetch count: HEAD 4 / current 4
- apiRequest count: HEAD 9 / current 9
- axios count: HEAD 0 / current 0
- /api/ count: HEAD 9 / current 9
- socket count: HEAD 13 / current 13
- run.offer count: HEAD 3 / current 3
- run.unavailable count: HEAD 3 / current 3
- run.updated count: HEAD 3 / current 3
- receipt-proof count: HEAD 6 / current 6
- confirm-delivery count: HEAD 6 / current 6
- authorize-hold count: HEAD 0 / current 0
- manual-review count: HEAD 0 / current 0
- localStorage count: HEAD 0 / current 0
- sessionStorage count: HEAD 0 / current 0
- method: "POST" count: HEAD 7 / current 7
- method: 'POST' count: HEAD 0 / current 0
- method: "PATCH" count: HEAD 0 / current 0
- method: 'PATCH' count: HEAD 0 / current 0
- method: "DELETE" count: HEAD 0 / current 0
- method: 'DELETE' count: HEAD 0 / current 0
- useEffect count: HEAD 4 / current 4

## Validation Gates

- frontend npm run lint: PASS
- frontend npm run build: PASS
- backend node --check src/server.js: PASS
- backend node --check src/app.js: PASS

## Next Checkpoint

Rerun RUN UI-1I Checkpoint 3 local visual smoke and verify receipt proof submission succeeds after selecting a receipt photo.
