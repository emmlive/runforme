# RUN-UI-1N — Production-Readiness UX & Responsive Hardening

## Status

Approved design specification. This document defines the production-readiness responsive hardening milestone; it does not claim that implementation has started.

## Context

RUNFORME has validated requester and runner workflows on mobile through RUN-UI-1M. The next milestone extends that coherent experience across mobile, tablet, and desktop while preserving the validated workflow and RUNFORME's own product character. The current frontend includes requester orchestration in `frontend/src/Dashboard.jsx`, the validated requester mobile path in `frontend/src/components/requester/RequesterMobileShell.jsx` and its CSS, runner orchestration and mobile navigation in `frontend/src/RunnerDashboard.jsx`, extracted runner components under `frontend/src/components/runner/`, shared primitives under `frontend/src/components/ui/`, and responsive styles under `frontend/src/`.

## Goals

- Establish one fluid responsive shell and layout system for mobile, tablet, and desktop.
- Keep mobile the primary, compact, action-first experience.
- Harden Requester and Runner layouts against overflow, obstruction, clipping, long content, and unclear state transitions.
- Preserve role-specific product intent: reassuring and ownership-oriented for Requester; operational and action-first for Runner.
- Make loading, empty, error, recovery, submission, and busy states intentional.
- Treat keyboard, focus, semantics, touch targets, and reduced motion as production requirements.
- Validate representative widths without creating device-specific applications.

## Non-Goals

- No new marketplace capabilities, lifecycle semantics, payment behavior, provider integration, backend service, database schema, or production configuration.
- No redesign of validated workflows merely to use additional width.
- No third independently designed mobile, tablet, or desktop application.
- No fabricated Earnings or Activity functionality.
- No restoration of duplicated legacy panels or command-center surfaces.
- No claim of formal WCAG certification.

## Protected RUN-UI-1M Baseline

The complete synthetic requester-to-runner lifecycle validated at 390 x 844 is a protected regression baseline. Responsive work may rearrange information but must not remove or obscure any critical information or action validated there. In particular, Runner primary actions must clear fixed navigation, and Requester history and completed-run presentation must remain understandable.

## Design Principles

1. Mobile first: begin with the compact hierarchy and add space deliberately at wider widths.
2. One system: use shared spacing, type, surface, state, and navigation rules rather than parallel applications.
3. Action clarity: the next meaningful action remains visually obvious and operable.
4. Progressive disclosure: secondary, technical, and advanced information yields to the primary task.
5. RUNFORME character: retain the calm, trustworthy requester tone and practical runner tone without imitating another marketplace.
6. Content honesty: distinguish responsive defects from capabilities that do not exist.
7. Reversible discovery: map actual components and styles before selecting implementation files.

## Responsive Architecture

Use a shared responsive shell with fluid sizing and layout transitions. Representative validation widths are 360px compact mobile, 390px protected mobile, 430px larger mobile, 768px tablet, 1024px tablet/small desktop, and 1440px desktop. These widths are test representatives, not hard device modes; interpolation between them must remain usable.

Mobile uses compact stacking, action-first ordering, fixed bottom navigation, and progressive disclosure. Tablet may use additional horizontal space and a clear two-column arrangement when it reduces scrolling. Desktop uses a centered, max-width application frame with useful information density; it must not stretch mobile cards into an enterprise dashboard. Navigation may move to a compact persistent side or top treatment only when width makes that materially clearer, while destinations and terminology remain stable.

The shared system must account for viewport units, safe-area insets, fixed navigation clearance, nested overflow, minimum content widths, and growing content. Layout rules must reserve trailing space for fixed controls instead of relying on accidental scroll room.

## Navigation Architecture

Requester destinations remain Home, Request, My Runs, and Menu. Runner destinations remain Home, Earnings, Activity, and Menu. Navigation labels, order, selected-state semantics, and destination meaning remain consistent across widths. Fixed mobile navigation must remain usable without covering primary actions, and any tablet or desktop transition must preserve the user's mental model.

## Requester Experience

### Home

Keep mobile simple: current or active run information leads, with history summary secondary. At tablet and desktop, active status may sit beside concise financial or handoff context without creating unnecessary widgets. Completed and no-active states must be immediately understandable.

### Request

Use one column on compact mobile. Naturally paired fields may become two columns at wider widths while preserving state ownership, payload conversions, and the funding/protection summary's visual connection to Create Run. Smart Handoff remains understandable and progressively disclosed; added width must not increase cognitive load.

### My Runs

Preserve progressive disclosure on mobile. Wider layouts may use list/detail or history/detail arrangements when hierarchy remains obvious. Selected details retain the same information hierarchy, with technical metadata secondary or advanced. The duplicated legacy RunDetailPanel-style presentation remains excluded.

### Menu

Keep Menu intentionally simple and responsive. It is a lightweight destination, not a desktop administration sidebar.

## Runner Experience

### Home

Home remains operational and action-first at every width. Available or active work outranks earnings, history, and menu information. Payout, location, and next action remain obvious. Smart Handoff “Before you go” stays contextual; standard handoff stays quiet. The primary run action must never be obscured by navigation.

### Earnings and Activity

Use available width appropriately while preserving current capability and checkpoint messaging. Do not invent an earnings backend, history feature, or activity data that the product does not provide.

### Menu

Keep Runner Menu lightweight, responsive, and consistent with Runner navigation.

## Resilience States

Where data or actions are asynchronous, each role must intentionally distinguish loading, empty, error, recovery, submission, and busy states. Requester states explicitly distinguish no active run, no history, loading, and temporary load failure. Runner states explicitly distinguish offline, waiting for work, active run, loading, and temporary load failure. Busy controls prevent accidental duplicate submissions where appropriate, while lifecycle semantics remain unchanged. Recovery actions explain what can be retried and retain user-entered context when safe.

## Accessibility Requirements

- Use semantic buttons and links with accessible names and appropriate navigation semantics.
- Associate form labels, descriptions, and errors programmatically.
- Preserve a logical keyboard tab order across shells, disclosures, forms, and primary actions.
- Provide visible keyboard focus that remains clear against each surface.
- Keep navigation and primary actions keyboard-operable.
- Provide touch targets that are usable on compact mobile.
- Communicate status and errors with text or structure, not color alone.
- Ensure dynamic loading, success, error, and busy changes are announced sensibly without disruptive repetition.
- Respect reduced-motion preferences wherever transitions exist.

## Long-Content Resilience

Test long locations, item descriptions, Smart Handoff instructions, filenames, status text, monetary summaries, and technical identifiers. Text must wrap predictably, cards must expand safely, and the page must not gain horizontal overflow. Primary actions must remain reachable above fixed navigation. Technical identifiers may remain in advanced or detail contexts, but must not force primary content wider than its container.

## Functional / Contract Invariants

RUN-UI-1N is frontend and responsive hardening. Preserve the RUN-UI-1M lifecycle, authentication contract, `POST /api/runs` contract, acceptance, arrival, receipt-proof, delivery-confirmation, and completion semantics. Preserve Secure Hold and payment-state behavior, Smart Handoff classification and backend/schema contract, provider behavior, Prisma schema, and production configuration. Do not change backend routes, database schema, payment integrations, or providers. If implementation discovery proves a backend change genuinely necessary, stop and obtain separate authorization.

## Representative Validation Widths

Validate both roles where applicable at 360, 390, 430, 768, 1024, and 1440 CSS pixels. Keep 390 x 844 as the protected mobile regression viewport. Validate fluid intermediate widths rather than treating representatives as exclusive modes.

## Production UX Quality Gates

For Requester and Runner surfaces where applicable, the eventual implementation must demonstrate:

- no horizontal page overflow;
- no fixed-navigation obstruction;
- no missing or duplicated primary action;
- no duplicated legacy UI;
- no clipped cards or forms;
- long-content resilience;
- coherent loading, empty, error, recovery, submission, and busy states;
- keyboard-accessible navigation and primary actions;
- logical, visible focus behavior;
- preserved 390 x 844 behavior;
- no API, lifecycle, payment, provider, schema, or authentication contract drift.

Responsive defects must be logged and corrected as bounded issues. Missing product functionality must remain outside this milestone.

## Checkpoint Strategy

### RUN-UI-1N-A — Responsive architecture audit and exact implementation map

Perform read-only discovery of Requester and Runner shells/components, CSS and existing breakpoints, navigation, legacy duplication, overflow and obstruction risks, accessibility gaps, resilience-state gaps, and exact candidate files.

### RUN-UI-1N-B — Shared responsive foundation

Establish common breakpoint, layout, and navigation behavior without materially redesigning individual validated workflows.

### RUN-UI-1N-C — Requester hardening

Harden Home, Request, My Runs, and Menu for responsive hierarchy, long content, loading/empty/error/recovery behavior, and accessibility.

### RUN-UI-1N-D — Runner hardening

Harden Home, Earnings, Activity, and Menu for responsive hierarchy, primary-action visibility, Smart Handoff and proof presentation, long content, loading/empty/error/recovery behavior, and accessibility.

### RUN-UI-1N-E — Cross-device validation

Run automated regression gates and browser validation at all representative widths for both roles where applicable. Every discovered defect receives a bounded correction and retest.

### RUN-UI-1N-F — Closure

Run focused regression tests, lint, production build, responsive contract validation, contract-drift audit, exact-scope review, and sensitive-data review where applicable. Commit and verify the approved scope; push only when separately authorized. Deployment remains separately authorized.

## Testing Strategy

Use focused component and layout regression tests for shared shell rules, navigation clearance, wrapping, state rendering, and action availability. Pair them with role-specific tests for Requester and Runner and browser checks at 360, 390, 430, 768, 1024, and 1440. Include keyboard traversal and focus checks, long-content fixtures, state transitions, and contract-drift checks. Keep provider-inert validation intact and do not require live services for responsive unit coverage.

## Safety Boundaries

Implementation must not create or alter lifecycle data merely to validate layout. Do not expose credentials, tokens, delivery secrets, receipt references, or provider keys in tests, fixtures, logs, or audit evidence. Do not access production or invoke payment, mapping, notification, or other external providers. Preserve the protected RUN-UI-1M behavior and stop for separate authorization if scope reaches backend, schema, provider, or production configuration.

## Completion Criteria

RUN-UI-1N is complete only when the shared responsive architecture and both role experiences pass the representative-width quality gates, the protected 390 x 844 behavior remains intact, resilience and accessibility requirements are verified, long-content checks pass, API/lifecycle/payment/provider contracts are unchanged, exact scope is reviewed, focused tests/lint/build pass, and the authorized commit and push gates are completed. This specification itself records design intent only; it does not authorize implementation or deployment.
