# RUN UI-1G Checkpoint 4A - requester Create Run action visibility

Status: PASS
Starting HEAD: 6812d6f

## Issue

- Local requester visual smoke showed the Create Run form, but the Create Run submit action was not visible in the viewport.
- The form fields were continuing horizontally, indicating the submit action could be pushed off-screen by the visual surface layout.

## Scope

- CSS-only layout rescue in rontend/src/components/requester/RequesterDashboardPolish.css.
- Kept requester Create Run form fields wrapping within the panel.
- Kept the submit action visible inside the Create Run surface.

## Guardrails

- No JavaScript behavior changes.
- No backend route changes.
- No Prisma or database changes.
- No auth/session/storage changes.
- No socket behavior changes.
- No payment/hold/manual-review changes.
- No run lifecycle behavior changes.

## Validation

- Checkpoint 4 anchors present.
- Changed-file scope checked.
- Dashboard behavior-sensitive counts unchanged.
- Frontend lint passed.
- Frontend build passed.
- Backend Node syntax checks passed.
- git diff --cached --check passed.

## Deploy

No deploy performed. Local visual verification only.
