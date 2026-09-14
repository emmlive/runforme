# RUN-UI-1N-A Responsive Architecture and Implementation Map

## Audit status and evidence boundary

- Checkpoint: `RUN-UI-1N-A`.
- Authority: `docs/superpowers/specs/2026-09-01-run-ui-1n-production-readiness-responsive-hardening-design.md` at starting `HEAD` `8b6dd6408b55f7afd83735b971ce60470c926a35`.
- Evidence: the committed Requester and Runner orchestrators, requester/runner/shared component trees, their imported styles, global styles, and `frontend/src/RunnerDashboard.mobile-layout.test.js`.
- This is discovery only. It does not authorize application, backend, schema, package, provider, production, or test changes.
- Task 1 has no automated source-test requirement. No RED result is claimed or fabricated; completeness, diff, scope, and sensitive-data review are its gates.

## Immutable milestone requirements

These requirements are constraints, not implementation suggestions.

1. Use one fluid, mobile-first system. Mobile stays compact, stacked, action-first, and progressively disclosed; tablet may add useful columns; desktop uses a centered bounded frame without stretching mobile cards into an enterprise dashboard. Representative widths are `360`, `390`, `430`, `768`, `1024`, and `1440` CSS px, with usable interpolation between them.
2. Preserve the protected `390 x 844` synthetic Requester-to-Runner lifecycle. Critical information and actions must not be removed or obscured. Runner primary actions clear fixed navigation; Requester history and completed-run presentation remain understandable.
3. Preserve role intent. Requester remains calm, reassuring, and ownership-oriented. Runner remains practical, operational, and action-first; available or active work outranks earnings, history/activity, and menu information.
4. Preserve destination names, order, selected-state meaning, and destination meaning at every width: Requester `Home`, `Request`, `My Runs`, `Menu`; Runner `Home`, `Earnings`, `Activity`, `Menu`.
5. Account for viewport units, safe-area insets, fixed-navigation clearance, nested overflow, minimum content widths, growing content, and long locations, items, instructions, filenames, status text, money, and technical identifiers. No horizontal page overflow, clipped cards/forms, obstructed actions, missing/duplicate primary actions, or duplicate legacy UI is acceptable.
6. Intentionally distinguish asynchronous loading, empty, error, recovery, submission, and busy states. Requester additionally distinguishes no active run and no history. Runner additionally distinguishes offline, waiting for work, and active run. Retain safe user input on retry and guard duplicate submissions.
7. Use semantic, named buttons/links/navigation; programmatically associated form labels, descriptions, and errors; logical keyboard order; visible focus; keyboard-operable navigation/actions; usable compact touch targets; non-color-only status/error communication; sensible dynamic announcements; and reduced-motion behavior. This milestone does not claim WCAG certification.
8. Preserve the existing lifecycle and all contract surfaces: authentication; `POST /api/runs`; acceptance; arrival; receipt proof; delivery confirmation; completion; Secure Hold and payment states; Stripe behavior; Smart Handoff classification and backend/schema fields; provider behavior; Prisma schema; and production configuration. No new marketplace, earnings, activity, account/settings, backend, schema, payment, provider, or production capability is authorized.
9. Do not restore the duplicate legacy `RunDetailPanel`-style surface into the compact path, invent a Start transition, or fabricate Earnings/Activity data. A backend/schema/provider/production need stops the work for separate authorization.
10. Do not access production or live providers, mutate lifecycle data for layout testing, or place credentials, tokens, delivery secrets, receipt references, provider keys, or private user content in source, tests, logs, screenshots, or audit evidence.

## Current architecture: ownership and live style graph

`frontend/src/main.jsx` imports `index.css` and `styles/tokens.css`, then mounts `App.jsx`. `App.jsx` owns session bootstrap, role selection, Stripe `Elements`, payment-page switching, and logout. It renders `Dashboard.jsx` for Requester and `RunnerDashboard.jsx` for Runner.

`frontend/src/App.css` is not imported anywhere in the current tree. Its desktop `#root { max-width: 1280px; padding: 2rem; }` and its `max-width: 560px` containment therefore do not affect the application. The live global root rules are in `index.css`; responsive work must not treat dormant `App.css` rules as proof of runtime behavior.

| Live path | State/behavior owner | Presentation/style owner |
| --- | --- | --- |
| Requester | `Dashboard.jsx` | `RequesterMobileShell.jsx`, requester extracted components, `requester-run-form.css`, `RequesterMobileShell.css`, `RequesterCommandCenter.css`, `RequesterDashboardPolish.css`, and `components/ui/ui.css` |
| Runner | `RunnerDashboard.jsx` | inline styles and inline `max-width: 560px` CSS in `RunnerDashboard.jsx`; extracted runner components and `RunnerCommandCenter.css`; `LiveMap.jsx` fallback |
| Global | `App.jsx`, `main.jsx` | active `index.css` and `styles/tokens.css`; dormant `App.css` |

The current Requester is two render branches selected by JavaScript, not one fluid shell: `useIsMobile(760)` renders `RequesterMobileShell` through `760px`; the legacy detailed branch renders above `760px`. `RequesterMobileShell.css` independently hides the mobile shell at `min-width: 761px`. The current Runner uses one DOM tree, but its role navigation and mobile action-first overrides exist only inside inline `@media (max-width: 560px)` CSS.

## Requester implementation trace

### Orchestration, state, and contracts

`Dashboard.jsx` owns all data and mutations; responsive work must leave this ownership in place.

| Owner | Current state or behavior | Exact consumers / consequence |
| --- | --- | --- |
| `useIsMobile(760)` | `window.innerWidth <= 760`, resize listener | Selects the entire mobile vs legacy branch. This exact threshold must be reconciled with CSS rather than multiplied into device modes. |
| `runs`, `loading` | `fetchRuns()` calls existing `GET /api/runs`; poll every 8 seconds | Derives `activeRuns` as every non-completed run and `completedRuns` as completed only. `loading` is visible only in the legacy Active Runs section, not passed to `RequesterMobileShell`. |
| `notification` | transient success/error object cleared by timers | Mobile `.requester-mobile-notification` uses `role="status"` even for errors; legacy notification has no live/alert semantics. A load failure becomes a transient notification and then looks like empty data. |
| `newRun` | location, item, payout, item budget estimate, platform fee, buffer, handoff requirement, identity requirement, confirmation, instructions | Shared by both form presentations. Task 3 may expose errors/semantics but must not change field names, defaults, conversions, maxima, or payload ownership. |
| `creatingRun` + ref guard | prevents duplicate `POST /api/runs` | Both submit buttons disable and change text. The shared `Button` is not passed its `loading` prop, so the state lacks `aria-busy`. |
| `selectedRunId` / `selectedRun` | selects explicit run, otherwise first active or first completed | Mobile `openRunId` must also match `selectedRun.id` before `MobileRunDetail` opens. Legacy always renders the selected/fallback `RunDetailPanel`. |
| `authorizingHold` + ref guard | existing `POST /api/runs/:id/authorize-hold` | Detail actions disable and change text. The mobile Home dominant action does not reflect/disable its busy state, though the handler guard blocks duplicate network calls. |
| `approvingManualReview` + ref guard | existing `POST /api/runs/:id/manual-review/approve` | Same Home-vs-detail busy-state gap as Secure Hold. |
| role/session | decodes the existing token and redirects invalid/missing sessions | Authentication storage, decoding, authorization header, expiry behavior, and role routing are frozen. |

The create request payload is frozen at the current fields and numeric conversions: location, item, payout, item budget estimate, platform fee, buffer, handoff requirement, identity requirement, handoff confirmation, and handoff instructions. No responsive test may introduce a new API field or send a real credential, payment value, or private fixture.

### Mobile destination and component map

`RequesterMobileShell.jsx` locally owns `destination`, `runsTab`, and `openRunId`.

| Destination | Exact current component/selector path | State/navigation behavior | Current gaps |
| --- | --- | --- | --- |
| Home | `.requester-mobile-home`, `.requester-mobile-active-card`, `.requester-mobile-request-card`, `.requester-mobile-home__status`, `.requester-mobile-runs-link` | Active run leads; otherwise Start a request leads. Dominant action is hold, review, or View run. | No explicit loading/load-failure/retry presentation. Home hold/review action omits busy/disabled text. Active title is clamped to two lines. |
| Request | `.requester-mobile-destination`, `MobileRequestForm`, `.requester-mobile-form-card`, `.requester-run-form`, `.requester-mobile-funding` | Reuses `Dashboard.jsx` form state and submit handler. Smart Handoff uses native `details` and buttons; funding preview is a second disclosure. | Compact widths retain two-column money/fee grids despite the approved one-column compact rule. Programmatic submission errors are not associated to fields. Disclosure focus is not consistently styled. |
| My Runs | `.requester-mobile-tabs`, `.requester-mobile-run-list`, `.requester-mobile-run-row`, `MobileRunDetail`, `.requester-mobile-disclosure`, `.requester-mobile-full-detail` | Active/History buttons use `role="tab"` and `aria-selected`; run buttons set both local open id and orchestrator selection. Back clears both. | Tabs have no `tabpanel` relationship. Row title/location and active title are truncated; status pills are nowrap. Loading/failure can masquerade as `No active runs` / `No history yet`. |
| Menu | `.requester-mobile-menu-list` | Refresh invokes existing `fetchRuns`; Sign out invokes existing logout. Header `Account` routes to Menu. | Lightweight scope is correct. Refresh is separated from transient load errors rather than presented as contextual recovery. |
| Fixed nav | `.requester-mobile-nav` and `.requester-mobile-nav button.is-selected` | Button order is Home, Request, My Runs (`id="runs"`), Menu; selected item has `aria-current="page"`. | Entire destination model disappears above 760px. Focus relies on the generic global button outline. No wide navigation transition exists. |

The shell correctly provides a viewport floor and bottom reservation: `.requester-mobile-shell { min-height: 100vh; padding-bottom: calc(76px + env(safe-area-inset-bottom)); }`, while `.requester-mobile-nav` is fixed and applies the bottom safe area. The sticky `.requester-mobile-header` does not include a top safe-area inset.

### Legacy/wide Requester map

Above `760px`, `Dashboard.jsx` renders:

1. `RequesterRunOverview` -> `RequesterRunOverviewIntro`, `RequesterMissionSummary`, `RequesterTrustTimeline`, and `RequesterRunLists`/`RequesterRunList` inside `.requester-command-shell--dashboard` and `.requester-command-shell__content`.
2. A separate `maxWidth: 900` legacy container with header actions, three metrics, `RunDetailPanel`, the full create form, Active Runs, and Completed Runs.
3. `RunDetailPanel` -> `RunTimeline` and `SecurityProofGrid`, including Secure Hold and manual-review actions.

This is not the prohibited duplicate panel inside the mobile path: `RequesterMobileShell` renders its own `MobileRunDetail`, and the passed `runDetailContent` prop is currently unused. However, the wide branch visibly duplicates summary/list information between `RequesterRunOverview` and the lower legacy panels. Task 3 must not reinsert `RunDetailPanel` into mobile and should avoid duplicating primary actions while establishing one responsive hierarchy.

Exact wide selectors needing verification are `.requester-command-shell--dashboard`, `.requester-command-shell__intro`, `.requester-command-shell__content`, `.requester-mission-summary__header`, `.requester-mission-summary__grid`, `.requester-run-lists`, `.requester-run-list__item`, `.requester-run-list__status`, `.run-requester-surface--create`, `.requester-run-form`, `.requester-run-form__field*`, `.requester-run-form__action`, `.requester-run-form-preview__metrics`, and `.requester-run-form__handoff-*`.

### Requester long-content and accessibility risks

- `.requester-mobile-run-row strong/small` force one-line ellipsis; `.requester-mobile-active-card h2` and detail heading clamp two lines. This conflicts with predictable wrapping and makes keyboard/touch users depend on incomplete text or a pointer-only `title` attribute.
- `.requester-run-list__status`, shared `.rf-status-pill`, and `.requester-run-form-card__status` use nowrap. Long/localized states can squeeze content or overflow.
- `.run-requester-surface` and `.run-requester-surface--create` use `overflow: hidden`; this can clip focus rings, validation affordances, or long descendants even where it prevents decorative overflow.
- `MobileRequestForm` has associated labels for controls, native required/min/max constraints, a named handoff group, `aria-pressed`, and status text for eligibility warnings. It lacks persistent inline error ownership and `aria-describedby`/`aria-errormessage` links for helper or submission errors.
- Native `summary` elements for funding/run/payment/advanced disclosures are keyboard-operable, but only the Smart Handoff summary has an explicit focus-visible rule. Mobile nav, tabs, run rows, menu buttons, back, and header controls have no role-specific focus treatment.
- Dynamic funding preview has `aria-live="polite"`; notification uses `role="status"`. Loading, load failure, recovery, and Home action busy transitions are not announced intentionally.

## Runner implementation trace

### Orchestration, state, navigation, and action ownership

`RunnerDashboard.jsx` owns all Runner state and actions. Extracted runner components are display-only and must not take over API or lifecycle calls.

| Owner | Current state or behavior | Exact presentation / gap |
| --- | --- | --- |
| `online`, `statusMessage` | status update through existing runner-status mutation; GPS starts only while online with an active run | Header toggle text distinguishes Offline/Online/Status failed, but it lacks `aria-pressed`, busy state, and contextual retry. |
| `runs` | initial fetch plus `run.offer`, `run.updated`, and `run.unavailable` socket events; completed/cancelled entries are removed | No loading or persistent fetch-error state. Initial, loading, failure, offline waiting, and genuine empty queue can all render `Waiting for jobs...`. |
| `activeRun` | first assigned/arrived/in-progress run | Renders active panel after a `55%` map surface. Mobile action-first CSS does not give the unclassed active panel the `.runner-ui-1l-mobile-primary` rules. |
| `availableRuns` | open runs with an offer id | `.runner-available-runs-panel.runner-ui-1l-mobile-primary`, at most three `.runner-available-run-card` items. Payout, location disclosure, Smart Handoff, and Accept are shown. |
| `deliveryPins`, `receiptProofs` | retains user-entered PIN/receipt amount and browser-selected receipt metadata/preview | Receipt amount, file input, and delivery PIN use placeholder/proximity rather than programmatic labels. Filename and active-panel text do not share the extracted component wrapping rules. |
| `acceptMessage`, `actionMessage` | text success/error results | Color and text are present, but containers have no alert/status/live semantics or error association. |
| `acceptingRunId` + ref | guards existing accept call | Button disables and changes text. |
| `activeAction` + ref | guards arrival, receipt proof, delivery confirmation, and completion | Buttons disable/change text per action. Completion additionally uses `getCompletionSafety()` to require receipt/review/delivery gates. |
| `mobileSection` | local Home/Earnings/Activity/Menu selection | Nav has correct order and `aria-current`; non-Home selection appends a placeholder sheet after Home content rather than making it the primary destination. Nav is absent above 560px. |

Frozen Runner mutations observed in the orchestrator are: runner online status with the existing boolean body; runner location with the existing latitude/longitude body; accept; arrived; receipt proof with the existing receipt amount and proof-reference fields; delivery confirmation with the existing PIN field; and completion. Socket room/event names and merge/removal behavior are likewise lifecycle contract, not layout code. No new Start action is authorized.

### Runner presentation map

| Surface | Exact selector/component | Current responsive behavior | Risk |
| --- | --- | --- | --- |
| Root/header | `.runner-dashboard-shell`, unclassed header controls | Inline `height: 100vh`; only the inline `max-width: 560px` rule overrides to `height: auto !important`, `min-height: 100vh`, and safe-area bottom padding. | At 561px+ content grows beyond a fixed-height shell with no shared bounded frame/nav model. Header may wrap but has no responsive selector contract. |
| Map | `.runner-map-surface`; conditional `.runner-ui-1l-mobile-map-secondary`; `LiveMap` | Inline `height: 55%`; no-active mobile hides map, active mobile retains the map/fallback before actions. Fallback has a 320px minimum and responsive card max widths. | Active mobile action can be pushed below a large map; long coordinate/location text needs wrap proof. |
| Active work | unclassed active panel; `.runner-smart-handoff-card`; receipt block identified by `data-run-ui-1i`; delivery copy identified by `data-run-ui-1h` | Same markup all widths; most layout is inline. | No exact active-panel selector for grid/order/focus tests; long item, filename, statuses, and action feedback can overflow or be poorly announced. |
| Available work | `.runner-available-runs-panel`, `.runner-available-run-card`, `.runner-location-disclosure`, `.runner-smart-handoff-card` | At <=560, compact card and full-width 52px action. At wider widths, one vertical list with no bounded shell owner. | Available card titles/locations need wrap proof; only first three offers render, which is existing product behavior and must not be changed under responsive scope. |
| Extracted overview | `RunnerCommandCenter` -> `RunnerOverviewHeader`, `RunnerActionStatusPanel`/`RunnerStatusSummary`, `RunnerFocusedRunSection`/`RunnerRunCard`, `RunnerTrustChecklistSection`/`RunnerTrustChecklist` | `.runner-command-center__grid` is two columns above 900 and one below; metrics/footer become one column below 620; broad long-content protection exists. Entire preview slot is hidden at <=560 by `.runner-ui-1l-mobile-secondary`. | Display copy calls itself a preview; it is secondary to live actions and cannot become a duplicated primary-action surface. |
| Destinations/nav | `.runner-mobile-section-sheet`, `.runner-mobile-nav`, `.runner-mobile-nav__item`, `--selected` | Hidden by default, displayed only <=560. Sheets honestly state unavailable Earnings/Activity/Menu details. | No tablet/desktop navigation. Selected non-Home destination remains after all Home surfaces; keyboard/focus order does not reflect a true destination switch. |

`RunnerSmartHandoffCard` correctly returns nothing for ineligible runs and for a standard/no-identity/no-instructions handoff. It shows contextual `Before you go` guidance only for eligible special requirements and wraps instructions with `overflowWrap: "anywhere"`. Responsive work must preserve this quiet-standard/contextual-special classification and the existing handoff eligibility, requirement, identity, confirmation, and instruction semantics.

### Existing Runner regression contract

`frontend/src/RunnerDashboard.mobile-layout.test.js` server-renders the real `RunnerDashboard` and asserts emitted inline CSS contains all three invariants:

- inside `@media (max-width: 560px)`, `.runner-dashboard-shell` overrides inline `100vh` with `height: auto !important`;
- `.runner-dashboard-shell` retains `min-height: 100vh`;
- it reserves `padding-bottom: calc(82px + env(safe-area-inset-bottom))`.

Tasks 2 and 4 must run this test unchanged as a protected regression. A future test may add contracts but must not weaken or replace these assertions.

### Runner accessibility and resilience risks

- Loading/fetch failure/recovery have no render state. Fetch errors go only to the console. Offline, waiting, and active are derivable but not expressed as a complete state model.
- Header status toggle lacks `aria-pressed`; action/accept results lack `role="status"`/`role="alert"`; busy controls do not expose `aria-busy`.
- Receipt amount, receipt file, and delivery PIN need real labels and associated helper/error text. File-read errors alone use `role="alert"`.
- Generic global focus exists for buttons, but Runner raw inputs, file control, disclosures, and role-specific dark-surface controls have no explicit visible-focus contract.
- `runner-mobile-section-sheet` is polite live content, and nav selected state uses `aria-current`; the destination order is correct. The appended-sheet architecture and missing >560 nav are the defects, not the honest placeholder copy.
- Long Smart Handoff instructions and extracted component descendants wrap, but active-panel item/status/filename/proof text and raw flex rows do not consistently set `min-width: 0` or wrapping.

## Shared primitives and global CSS audit

| Owner / selector | What exists | Risk / later-task requirement |
| --- | --- | --- |
| active `index.css`: `body` | `display: flex`, centered placement, `min-width: 320px`, `min-height: 100vh`; block/width containment only at <=560 | No live all-width `#root` 100%/bounded-frame contract. The 561-760 gap is especially risky for the Requester mobile branch. Establish page-width and horizontal-overflow ownership without hiding defects. |
| dormant `App.css`: `#root` | max 1280/padding 2rem and <=560 containment, but no importer | Cannot be credited to runtime and is excluded from the no-amendment Task 2 route. Activation/import requires a separately authorized plan amendment. |
| `styles/tokens.css` | colors, spacing, radius, motion, fluid type; global border-box; `prefers-reduced-motion: reduce` collapses motion | Correct owner for shared shell/gutter/nav-clearance/focus tokens if Task 2 proves them. Reduced motion is present and must remain. |
| `.rf-button` / `Button.jsx` | semantic button, default `type="button"`, disabled-or-loading guard, `aria-busy` only through `loading`, 44/52px md/lg targets | `white-space: nowrap` can overflow. Current callers mostly use `disabled` and custom text, bypassing the primitive's `aria-busy`. Add a visible focus contract shared with raw controls. |
| `.rf-badge`, `.rf-status-pill`, `.rf-trust-badge` | text labels plus tone classes | `white-space: nowrap` can squeeze headings or overflow with long states. Role overrides or shared wrap/min-width rules are needed. |
| `.rf-card` | semantic `as` options and fluid padding <=720 | No base `min-width: 0`; `overflow: hidden` is added by role polish and may clip focus. |
| `.rf-action-bar--sticky` | sticky at bottom 16px | Not currently used in either role; its offset is not safe-area aware. Do not introduce it without adding clearance and tests. |
| `Drawer.jsx` / `.rf-drawer*` | named modal dialog and close controls; max-height with internal scrolling | Not currently used in either role; no demonstrated focus trap/restore or Escape behavior. It is not a solution candidate for this milestone unless separately proven by a failing role requirement. |
| `EmptyState`, section/mission/trust primitives | semantic headings/text and flexible layouts | Mostly unused by current role paths. Reuse is allowed, but replacement primitives and broad migration are not justified. |

## Breakpoint ownership and discontinuity map

| Boundary | Current owner(s) | Current effect / concern |
| --- | --- | --- |
| <=380 | `RequesterMobileShell.css` | Slight Requester card/nav padding change only. It is a compact refinement, not a device mode. |
| <=390 | `RunnerCommandCenter.css` | Preview padding/radius refinement, but preview is hidden at <=560 in the live Runner. |
| <=520 | `RunnerCommandCenter.css` | Extracted preview refinements; also hidden in the live mobile path. |
| <=560 | active `index.css`; three requester CSS files; inline Runner CSS | Global containment starts; Requester command containment/polish activates; Runner auto-height, fixed-nav clearance, action-first available cards, nav, and destination sheets activate. This is the only Runner navigation range. |
| <=620 | `RunnerCommandCenter.css` | Extracted status/card header, metrics, and footer stack. |
| <=640 | `requester-run-form.css` | Base form becomes one column and handoff buttons stack, but mobile-shell `!important` two-column rule later overrides the field grid for paired fields. |
| <=720 | `ui.css`, requester polish, runner command CSS | Shared headers/actions stack; Requester polished create form becomes one column; several Runner extracted/fallback refinements. |
| <=760 / >=761 | `Dashboard.jsx` `useIsMobile(760)`; requester polish <=760; `RequesterMobileShell.css` >=761 | Entire Requester application branch changes at 760/761. At 768, tablet gets legacy desktop content and no role navigation. |
| <=860 | `RequesterCommandCenter.css` | Summary header and two-column run lists stack; intro becomes one column. Only relevant in legacy branch from 761-860. |
| <=900 | `requester-run-form.css`; `RunnerCommandCenter.css` | Requester base fields become six columns, though polish auto-fit has `!important`; Runner extracted command grid becomes one column. |
| <=960 | `RunnerCommandCenter.css` | Extracted preview shell refinement. |
| >960 | no outer role breakpoint | No shared desktop navigation or centered application frame. Nested cards have max widths, but role shells do not share one outer contract. |

The current set is fragmented (`380`, `390`, `520`, `560`, `620`, `640`, `720`, `760/761`, `860`, `900`, `960`). Task 2 should establish shared fluid primitives; Tasks 3 and 4 should consume them and retain only content-driven transitions. The six validation widths must not become six new media queries.

## Representative-width implementation and validation matrix

| Width | Intended fluid behavior | Exact selectors/components to validate | Current finding |
| --- | --- | --- | --- |
| 360 | Compact one-column Requester form; fixed four-item nav; Runner action first with nav clearance; all long content wraps | Requester `RequesterMobileShell`, `.requester-mobile-shell`, `.requester-mobile-main`, `.requester-mobile-form-card .requester-run-form`, `.requester-mobile-protection-fees`, `.requester-mobile-run-row`, `.requester-mobile-detail-row`, `.requester-mobile-nav`, `.requester-run-form__action`; Runner `RunnerDashboard`, `.runner-dashboard-shell`, `.runner-map-surface`, `.runner-ui-1l-mobile-primary`, `.runner-available-runs-panel`, `.runner-available-run-card`, `.runner-smart-handoff-card`, `.runner-mobile-section-sheet`, `.runner-mobile-nav`; active-work target is the currently unclassed `activeRun && <div>` block in `RunnerDashboard.jsx` immediately following `.runner-map-surface` | Requester paired grids remain two columns; title/list truncation persists. Runner clearance exists, but active map/action ordering, labels, and state semantics are not hardened. |
| 390 | Protected `390 x 844` baseline; same compact hierarchy with no obstruction or regression | Requester `RequesterMobileShell`, `.requester-mobile-shell`, `.requester-mobile-active-card`, `.requester-mobile-detail-action`, `.requester-mobile-inline-action`, `.requester-run-form__action`, `.requester-mobile-disclosure`, `.requester-mobile-full-detail`, `.requester-mobile-nav`; Runner `RunnerDashboard`, `.runner-dashboard-shell`, `.runner-map-surface`, `.runner-ui-1l-mobile-primary`, `.runner-available-run-card`, `.runner-smart-handoff-card`, `[data-run-ui-1i="receipt-photo-upload"]`, `[data-run-ui-1h="runner-delivery-pin-copy"]`, `.runner-mobile-section-sheet`, `.runner-mobile-nav`; active-work target is the currently unclassed `activeRun && <div>` block; regression owner is `RunnerDashboard.mobile-layout.test.js` | Both fixed-nav reservations exist. Preserve exact Runner regression values and validate complete lifecycle manually later without real mutations/providers. |
| 430 | Larger mobile may breathe but stays compact/action-first; no abrupt device redesign | Requester `RequesterMobileShell`, `.requester-mobile-shell`, `.requester-mobile-main`, `.requester-mobile-form-card .requester-run-form`, `.requester-run-form__handoff-summary`, `.requester-mobile-funding > summary`, `.requester-mobile-run-row`, `.requester-mobile-detail-row`, `.requester-mobile-nav`; Runner `RunnerDashboard`, `.runner-dashboard-shell`, `.runner-map-surface`, `.runner-ui-1l-mobile-primary`, `.runner-location-disclosure`, `.runner-smart-handoff-card`, `[data-run-ui-1i="receipt-photo-upload"]`, `.runner-mobile-section-sheet`, `.runner-mobile-nav`; active-work target is the currently unclassed `activeRun && <div>` block | Requester remains mobile through 760. Runner remains mobile only through 560. Current truncation and missing states remain. |
| 768 | Tablet: stable destinations, one coherent shell, columns only where they reduce scrolling | Global active `body` and `#root` in `index.css`; Requester `Dashboard`/`useIsMobile(760)`, `RequesterRunOverview`, `.requester-command-shell--dashboard`, `.requester-command-shell__intro`, `.requester-command-shell__content`, `.requester-run-lists`, `.run-requester-surface--create`, `.requester-run-form`, `.requester-run-form__field`, `.requester-run-form__action`; wide navigation owners are `Dashboard` branch selection and `RequesterMobileShell`'s `.requester-mobile-nav`, which is not rendered at this width; Runner `RunnerDashboard`, `.runner-dashboard-shell`, `.runner-map-surface`, `.runner-command-center-preview-slot`, `.runner-command-center__grid`, `.runner-available-runs-panel`; active-work target is the currently unclassed `activeRun && <div>` block; wide navigation owner is `RunnerDashboard`'s `.runner-mobile-nav`, hidden outside its inline `max-width: 560px` rule | Requester has already switched to legacy branch with no nav and overlapping form rules. Runner mobile nav is gone, map is 55% of fixed-height shell, and no tablet nav replacement exists. |
| 1024 | Tablet/small desktop: centered bounded frame, useful two-column hierarchy, stable actions/destinations | Global active `body` and `#root` in `index.css`; Requester `Dashboard`, `RequesterRunOverview`, `.requester-command-shell--dashboard`, `.requester-mission-summary__grid`, `.requester-run-lists`, `.run-requester-surface--create`, `.requester-run-form`, `.requester-run-form-preview__metrics`; wide navigation owners are `Dashboard` branch selection and the non-rendered `RequesterMobileShell` `.requester-mobile-nav`; Runner `RunnerDashboard`, `.runner-dashboard-shell`, `.runner-map-surface`, `.runner-command-center-preview-slot`, `.runner-command-center`, `.runner-command-center__grid`, `.runner-available-runs-panel`; active-work target is the currently unclassed `activeRun && <div>` block; wide navigation owner is the hidden `.runner-mobile-nav` in `RunnerDashboard` | Dormant `App.css` means no active global max-frame rule. Nested Requester/Runner cards are bounded inconsistently; role navigation is absent. |
| 1440 | Desktop: centered max-width frame and useful density without stretched mobile cards | Global active `body` and `#root` in `index.css`; Requester `Dashboard`, `RequesterRunOverview`, `.requester-command-shell--dashboard`, `.requester-command-shell__content`, `.requester-mission-summary__grid`, `.requester-run-lists`, `.run-requester-surface--create`, `.requester-run-form`; wide navigation owners are `Dashboard` branch selection and the non-rendered `RequesterMobileShell` `.requester-mobile-nav`; Runner `RunnerDashboard`, `.runner-dashboard-shell`, `.runner-map-surface`, `.runner-command-center-preview-slot`, `.runner-command-center`, `.runner-command-center__grid`, `.runner-available-runs-panel`; active-work target is the currently unclassed `activeRun && <div>` block; wide navigation owner is the hidden `.runner-mobile-nav` in `RunnerDashboard` | Some nested max widths exist (Requester 900/1120/1180; Runner 1120/1180), but outer role shells and navigation do not form one centered system. |

At each width also verify intermediate resizing, `document.documentElement.scrollWidth <= clientWidth`, primary action visibility above fixed nav, no duplicate legacy panel/action, full keyboard traversal and visible focus, text/status wrapping, and explicit loading/empty/error/recovery/busy states.

## Defect versus missing-capability ledger

### Responsive/product-quality defects in scope

- Dormant `App.css` plus live `body` flex sizing leaves no tested all-width root/frame owner.
- Requester swaps entire applications at 760/761 and loses named role navigation above that split.
- Runner role navigation exists only <=560, while non-Home mobile destinations append after Home instead of becoming the primary destination.
- Compact Requester form uses two-column paired grids before a wider-width transition is justified.
- Requester truncation/nowrap and role `overflow: hidden` rules conflict with long-content and focus requirements.
- Runner fixed `100vh`, 55% map ordering, unclassed active panel, and no tablet/desktop shell risk action reachability and uneven density.
- Both roles have incomplete loading/error/recovery/announcement semantics; Runner fetch has no user-visible failure state.
- Busy guards exist, but Home Requester hold/review and multiple raw controls do not expose the state consistently.
- Labels/error associations/focus treatment are incomplete, especially Runner proof/PIN controls and disclosure summaries.

### Missing capabilities that must remain honest and out of scope

- Runner Earnings backend/details are unavailable; retain checkpoint messaging and current payout display only.
- Runner Activity/history data is unavailable; retain checkpoint messaging and current Home status only.
- Runner Menu settings/account capabilities are unavailable; retain a lightweight placeholder/return path and existing header sign-out.
- No new marketplace widgets, payment flow, live Stripe charge, provider activation, map behavior, lifecycle transition, or formal WCAG certification may be invented to fill layout space.

## Frozen contract-drift guardrails

| Contract | Must remain unchanged through Tasks 2-4 |
| --- | --- |
| Authentication | App role routing, token/session lifecycle, authorization transport, expiry behavior, logout, and protected-route assumptions. No token values in tests/evidence. |
| Request creation | Existing `POST /api/runs`, exact fields/conversions/validation and form state ownership in `Dashboard.jsx`. |
| Secure Hold/payment/Stripe | Existing hold authorization endpoint/state, placeholder/no-live-charge meaning, payment-state labels, `Elements` placement, payment-intent flow, and provider-inert test behavior. |
| Lifecycle | Existing open -> assigned -> arrived/in-progress -> completed/cancelled interpretation; accept, arrived, receipt/review, delivery confirmation, and completion handlers/guards. No invented Start or reordered server mutation. |
| Smart Handoff | Existing eligibility filter, standard quiet behavior, special `Before you go` context, requirement/identity/confirmation/instruction fields, and backend/schema classification. |
| Receipt/delivery | Existing receipt amount/proof-reference payload, browser preview behavior, file constraints, manual-review gate, delivery PIN payload and privacy copy, and completion safety. Evidence must never include a real filename, proof reference, or PIN. |
| Providers/schema/config | No live mapping/payment/notification invocation, environment-value change, Prisma/migration/backend route change, or production configuration change. |

## Exact candidate implementation files for later tasks

The tables below contain only candidates already inside the binding plan, except where an entry is explicitly separated as a proposed plan amendment. A candidate is not a requirement to touch every file; later tasks must use a failing contract and the smallest subset. No file is assigned to more than one implementation task, and this audit does not authorize a plan amendment.

### Task 2 — shared responsive foundation (`RUN-UI-1N-B`)

| Candidate | Why it is the proven owner |
| --- | --- |
| `frontend/src/index.css` | Active global `body`, `html`, and narrow `#root` sizing; the correct live owner for all-width containment, page overflow, and root sizing. |
| `frontend/src/styles/tokens.css` | Active shared sizing/motion/token layer; correct place for shared gutter, frame, nav-clearance, focus, and viewport tokens when tests prove them. |
| `frontend/src/responsive-foundation.test.js` | New focused contract for the active style graph, root width/frame, gutters, overflow, safe areas, focus, motion, and fluid-not-device-specific behavior. |

Exact no-amendment decision: `frontend/src/App.css` is excluded from Task 2 implementation because it is dormant, and `frontend/src/main.jsx` remains excluded. Task 2 must implement and test the shared foundation through the already active `index.css` and `styles/tokens.css` owners. Activating/importing `App.css`, or editing `main.jsx` to do so, would require a separately authorized plan amendment; this audit does not grant it.

`frontend/src/components/ui/ui.css` is a source-supported owner for shared button/status/card/action-bar focus, nowrap, min-height, and sticky behavior, but it is not in Task 2's binding file list. Treat adding it to Task 2 as a proposed plan amendment requiring controller authorization. Without that authorization, Task 2 must leave it unchanged and use only the binding active owners above.

### Task 3 — Requester hardening (`RUN-UI-1N-C`)

| Candidate | Why it is the proven owner |
| --- | --- |
| `frontend/src/Dashboard.jsx` | Requester branch selection, loading/error/recovery ownership, all form state/conversions, busy guards, selection, existing mutations, and legacy hierarchy. Contract code may be exposed semantically, not moved or changed. |
| `frontend/src/components/requester/RequesterMobileShell.css` | Fixed nav/safe-area clearance, mobile shell/frame, form pairing, disclosures, truncation, touch targets, and role focus. |
| `frontend/src/components/requester/RequesterCommandCenter.css` | Wider overview/list grids, max widths, wrapping, reduced motion, and current 860/560 transitions. |
| `frontend/src/components/requester/RequesterDashboardPolish.css` | Existing role overflow containment, `!important` form auto-fit behavior, clipping risk, and 760/720/560 overrides. |
| `frontend/src/requester-run-form.css` | Canonical form grid, field widths, labels/helpers, controls/focus, Smart Handoff layout, preview, and 900/640 transitions. |
| `frontend/src/requester-responsive.test.js` | New focused SSR/style contract for both states and exact selectors at all representative widths. |

`frontend/src/components/requester/RequesterMobileShell.jsx` is the source-supported owner of destination state/navigation, mobile state markup, disclosures, and Home busy-action presentation, but it is not in Task 3's binding file list. Treat adding it to Task 3 as a proposed plan amendment requiring controller authorization. Without that authorization, Task 3 must leave it unchanged; `Dashboard.jsx` and the binding CSS files cannot by themselves make this component consume new loading/error/busy props. The other requester JSX files remain excluded unless separately authorized after focused proof.

### Task 4 — Runner hardening (`RUN-UI-1N-D`)

| Candidate | Why it is the proven owner |
| --- | --- |
| `frontend/src/RunnerDashboard.jsx` | Root sizing, inline breakpoint, active/available hierarchy, all navigation/state messaging, Smart Handoff card, proof/PIN controls, and every lifecycle action/busy guard. |
| `frontend/src/components/runner/RunnerCommandCenter.css` | Extracted shell/grid/wrapping/breakpoints, available-run and map-fallback styling. It can style exact new active-panel hooks without moving behavior. |
| `frontend/src/components/runner/RunnerCommandCenter.jsx` | Wide command-center ordering and non-duplicative composition. |
| `frontend/src/components/runner/RunnerOverviewHeader.jsx` | Wide role heading/note semantics and hierarchy. |
| `frontend/src/components/runner/RunnerActionStatusPanel.jsx` | Existing status-region boundary for loading/offline/waiting/error/busy semantics. |
| `frontend/src/components/runner/RunnerStatusSummary.jsx` | Exact status label/metric markup and non-color state text. |
| `frontend/src/components/runner/RunnerFocusedRunSection.jsx` | Existing focused-work section boundary; must remain presentation-only. |
| `frontend/src/components/runner/RunnerRunCard.jsx` | Focused/available-like title, status, route/detail, and long-content markup. |
| `frontend/src/components/runner/RunnerTrustChecklistSection.jsx` | Existing contextual checklist section boundary and ordering. |
| `frontend/src/runner-responsive.test.js` | New focused SSR/style contract for state semantics, hierarchy, nav, wrapping, and widths. |

`deriveRunnerCommandData.js`, backend/API/schema/provider files, `LiveMap.jsx`, and package/lock files are excluded absent new proof. `RunnerTrustChecklist.jsx` can remain unchanged because its descendant wrapping is owned by `RunnerCommandCenter.css`. `frontend/src/RunnerDashboard.mobile-layout.test.js` is a required unchanged regression input, not a candidate to weaken.

## Task 2-4 acceptance handoff

- Task 2: prove the active CSS import graph, one root/frame/gutter/overflow contract, safe-area tokens, visible focus, reduced motion, and the existing Runner mobile clearance test.
- Task 3: test and harden all four Requester destinations, active/no-active/history/loading/failure/recovery/busy states, one-column compact form with wider pairing, non-duplicated detail/actions, labels/errors/focus, fixed-nav clearance, and long content.
- Task 4: test and harden all four Runner destinations, offline/waiting/loading/failure/recovery/available/active/busy states, payout/location/next-action priority, special-only Smart Handoff, receipt/proof/delivery ordering, exact lifecycle guards, fixed-nav clearance, labels/errors/focus, and long content.
- Tasks 2-4 must validate `360`, `390`, `430`, `768`, `1024`, and `1440` CSS px as representatives plus intermediate resizing; `390 x 844` remains the protected repeat.
- Every later task must stop on backend, schema, payment/provider, production, auth, or lifecycle drift and must never use live services or sensitive fixtures.

## Audit safety and scope conclusion

The audit records identifiers, selectors, field names, and route shapes only. It contains no credential/token values, environment values, database secrets, delivery PINs, receipt references, private filenames, provider keys, or live user data. No backend, schema, package, lock, generated, runtime, application source, style, or test file is authorized by this checkpoint. The only Task 1 tracked artifact is this audit.
