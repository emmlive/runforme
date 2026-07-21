# RUN UI-1J Checkpoint 1C - Selected Scope

## Decision

RUN UI-1J will normalize the requester run-creation form to the established RUN UI primitives and validation patterns.

## Selected Customer-Facing Workflow

Requester dashboard run creation.

Primary implementation surface:

- frontend/src/Dashboard.jsx

## Evidence

- The UI-1J inventory recorded 65 candidate signals.
- The review recorded 12 raw form controls across three customer-facing surfaces.
- Requester Dashboard raw controls: 6.
- Login raw controls: 3.
- Runner Dashboard raw controls: 3.
- Browser prompt or alert candidates: 0.
- URL-related findings were API configuration, internal fetch usage, download-object handling, or receipt-proof implementation references rather than a new user-facing URL-entry workflow.
- Most placeholder findings represented ordinary field hint text or the intentionally deferred secure-hold payment placeholder.

## Selection Rationale

The requester run-creation form is the largest remaining concentrated raw-form-control surface and is a core conversion workflow. Normalizing it provides greater customer impact than changing the smaller login or runner control groups.

## Planned Implementation Boundary

Checkpoint 2 may:

- Replace the requester run-creation form's raw controls with existing RUN UI form primitives where compatible.
- Normalize labels, helper text, field grouping, spacing, focus treatment, required-state presentation, and inline validation.
- Preserve current requester form state, submission behavior, API payload, and run-creation route contract.
- Preserve secure-hold authorization behavior.

Checkpoint 2 must not:

- Change backend routes.
- Change request or response payload contracts.
- Change database schema.
- Activate live Stripe charging.
- Alter runner receipt-proof behavior.
- Redesign Login or RunnerDashboard controls in the same checkpoint.
- Deploy.

## Deferred Candidate Scopes

- Login form primitive normalization.
- Runner proof and completion form primitive normalization.
- Live secure-hold payment implementation.
- Broad API client consolidation.

## Checkpoint 2 Entry Gate

Before implementation, map the exact requester run-creation form slice, identify the existing RUN UI primitives available for each field, and record the payload-preservation contract.

## Scope Confirmation

- Checkpoint 1C changes audit documentation only.
- No application source changes.
- No backend changes.
- No database schema changes.
- No deployment performed.

## Disposition

READY_FOR_RUN_UI_1J_CHECKPOINT_2_REQUESTER_FORM_IMPLEMENTATION_MAP
