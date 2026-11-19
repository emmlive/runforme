# RUN-UX-2A — Requester Launch Copy & State Audit

## Scope

Read-only audit of requester-facing launch copy and state presentation across:

- `frontend/src/Dashboard.jsx`
- `frontend/src/components/requester/RequesterMissionSummary.jsx`
- `frontend/src/components/requester/RequesterRunOverviewIntro.jsx`
- `frontend/src/components/requester/RequesterTrustTimeline.jsx`
- `frontend/src/components/requester/RequesterMobileShell.jsx`

No source behavior, API contract, payment flow, payout flow, database state, or Render configuration is changed by this audit.

## Audit Result

**READY_FOR_RUN_UX_2B_REQUESTER_LAUNCH_POLISH=YES**

The requester experience is functionally strong, but several visible strings still expose internal engineering language. These should be replaced before launch with outcome-oriented customer language.

## Finding 1 — Internal implementation language is visible to requesters

Current strings include:

- “Live requester run data is now feeding this command surface.”
- “Hold readiness is visible from the active requester run.”
- “Runner acceptance details are reflected from the active run.”
- “Delivery proof signals are reflected from the active run.”
- “Live requester overview”
- “Real run data, trust checkpoints, and current movement stay grouped before the detailed panels below.”
- “Current status is updated from your requester dashboard.”

Why this should change:

These strings explain how the UI is implemented rather than what the requester needs to know.

Recommended direction:

- “Your request is ready.”
- “Funding protection is ready.”
- “A runner has accepted your request.”
- “Delivery proof is available.”
- “Your run at a glance.”
- “Track each step from request to completion.”
- “We’ll keep this status up to date.”

## Finding 2 — Checkpoint / placeholder language remains in reusable requester components

Current strings include:

- “Secure hold placeholder”
- “Authorization state can be displayed without changing money movement or server route behavior.”
- “A presentational timeline for the requester journey. It is intentionally data-neutral for this checkpoint.”
- “Flow preserved”

Why this should change:

These are development-era phrases and should never appear in launch UI.

Recommended direction:

- “Funding protection”
- “Authorize the estimated hold before a runner is dispatched.”
- “Follow your request from creation through delivery.”
- “On track” or remove the status chip entirely.

## Finding 3 — Secure Hold copy is accurate but too technical

Current strings include:

- “Authorize the estimated Secure Hold before this run becomes available for runner dispatch. The final captured amount is determined by the completed run and remains subject to the authorized hold.”
- “Secure Hold authorization is required before runner dispatch.”
- “Secure Hold authorization protects the approved spending limit before runner dispatch.”

Why this should change:

The current wording is technically precise but sounds like backend/payment-system documentation. Requesters need the action, purpose, and outcome in plain language.

Recommended direction:

- Heading: “Protect this request”
- Primary action: keep “Authorize Secure Hold” for continuity
- Supporting copy: “Authorize the estimated amount so a runner can accept the request. You’ll only be charged according to the completed run, up to the amount you approved.”
- Short mobile copy: “Authorize the estimated amount to send this request to runners.”

Guardrail:

Do not imply that funds are captured at authorization. Preserve the existing authorization/capture distinction.

## Finding 4 — Manual review language can be more customer-centered

Current strings include:

- “Approve Manual Review”
- “Review required before completion”
- “Check the receipt and final amount.”

Why this should change:

“Manual review” is internal terminology. The requester action is really to review a receipt/final amount and approve continuation.

Recommended direction:

- Heading: “Review purchase”
- Status: “Your review is needed”
- Primary action: “Approve purchase”
- Supporting copy: “Check the receipt and final amount before the run is completed.”

Guardrail:

Do not change backend route names or review-state semantics; this is presentation-only.

## Finding 5 — Requester mission/overview branding can be simplified

Current strings include:

- “Requester Command Center”
- “Your runs, secured and in motion.”
- “Track live requests, secure holds, delivery proof, and review checkpoints from one calm requester command surface.”

Recommended launch direction:

- Eyebrow: “Your RUNFORME”
- Title: “Your requests, in one place.”
- Copy: “Track active runs, funding protection, delivery proof, and completed history.”

This preserves the premium command-center feel without exposing product-development vocabulary.

## Finding 6 — Existing strengths to preserve

Do not regress these existing launch-ready behaviors:

- “What do you need done?” requester home framing
- “Start a request” CTA
- clear Active / History separation
- delivery PIN privacy copy
- mobile-first run detail
- funding details disclosure pattern
- completed-run history
- runner status progression
- no hidden automatic retry on requester mutations
- Secure Hold fail-closed behavior
- receipt/manual-review safety checks
- payout/payment lifecycle semantics

## RUN-UX-2B Proposed Edit Scope

Modify only requester-facing presentation copy and related source-contract tests in:

- `frontend/src/Dashboard.jsx`
- `frontend/src/components/requester/RequesterMissionSummary.jsx`
- `frontend/src/components/requester/RequesterRunOverviewIntro.jsx`
- `frontend/src/components/requester/RequesterTrustTimeline.jsx`
- `frontend/src/components/requester/RequesterMobileShell.jsx`
- requester copy/contract tests as needed

Out of scope:

- backend routes
- Prisma schema/migrations
- Stripe integration
- Secure Hold orchestration
- runner payout logic
- dispatch behavior
- receipt validation behavior
- manual-review backend semantics
- Maps
- Pulse

## Acceptance Gate for RUN-UX-2B

1. No visible requester copy contains “placeholder”, “checkpoint”, “data-neutral”, “command surface”, or “flow preserved”.
2. No visible requester copy describes internal UI/data wiring.
3. Secure Hold copy explains authorization without implying capture.
4. Manual-review UI is customer-centered while preserving backend semantics.
5. Existing requester read/mutation safety contracts remain green.
6. Mobile and desktop requester behavior remains unchanged except for approved presentation text.
7. Full frontend regression remains green.
