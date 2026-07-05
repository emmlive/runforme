# RUN UI-1D Checkpoint 1 - Runner Command Center Current-State Audit

Base commit: `c27c75b` - Close requester command center redesign lane

## Scope

Checkpoint 1 opens the RUN UI-1D runner command center redesign lane.

This checkpoint is audit-only. It maps the current `RunnerDashboard.jsx` structure and records safe extraction targets before any runner UI redesign work begins.

Changed files:

- `docs/audits/RUN-UI-1D-checkpoint-1-runner-command-center-current-state-audit.md`
- `docs/audits/RUN-UI-1D-runner-dashboard-slices/`

## Starting Point

RUN UI-1C requester command center redesign is closed at `c27c75b`.

RUN UI-1D will apply the same regression-safe approach to the runner dashboard:

- audit first
- small scoped extraction checkpoints
- display-only components before behavior changes
- no API/backend/payment mutations unless explicitly scoped
- protected runner accept/start/arrived/receipt/delivery/complete flows

## RunnerDashboard Current Shape

- File: `frontend/src/RunnerDashboard.jsx`
- Total lines: 1004
- Inline style block count: 45

## Behavior-Sensitive Anchor Counts

- ${key}: 0
- ${key}: 9
- ${key}: 0
- ${key}: 9
- ${key}: 13
- ${key}: 3
- ${key}: 3
- ${key}: 3
- ${key}: 20
- ${key}: 6
- ${key}: 6
- ${key}: 13
- ${key}: 0
- ${key}: 3
- ${key}: 6
- ${key}: 4
- ${key}: 0
- ${key}: 0
- ${key}: 56

## Likely Runner UI Zones Found

- ${zone}: lines 865, 873
- ${zone}: lines 10, 11, 540, 548
- ${zone}: lines 61, 62, 67, 156, 157, 160, 164, 890, 895, 900, 927, 931, 933, 934, 936, 939, 942, 946, 949, 951, 965, 967, 970, 972, 974, 977, 978, 981, 987, 988, 996
- ${zone}: lines 201, 276, 618
- ${zone}: lines 85, 272, 283, 284, 293, 301, 309, 314, 492, 565, 566, 568, 569, 572, 576
- ${zone}: lines 15, 16, 19, 26, 30, 33, 34, 49, 59, 327, 328, 329, 330, 332, 333, 337, 338, 342, 351, 353, 357, 358, 370, 375, 608, 609, 629, 655, 658, 659, 661, 664, 669, 675, 677, 681, 685, 700, 702, 706, 710, 724, 725, 727, 728, 731
- ${zone}: lines 38, 41, 42, 49, 58, 388, 389, 391, 392, 396, 405, 407, 411, 412, 424, 429, 744, 747, 749, 754, 758, 760, 765, 780, 781, 783, 784, 787
- ${zone}: lines 48, 49, 189, 442, 443, 452, 457, 460, 468, 473, 831, 834, 839, 844, 852, 854
- ${zone}: lines 15, 26, 578, 586, 599, 600, 629, 647, 882, 913
- ${zone}: lines 6, 794, 815, 818, 827, 833, 838, 843, 850, 851, 882, 922, 967, 974
- ${zone}: lines 4, 11, 26, 34, 42, 49, 60, 61, 62, 63, 79, 88, 92, 128, 142, 160, 164, 289, 290, 298, 300, 307, 312, 321, 333, 338, 347, 348, 357, 360, 368, 373, 382, 392, 401, 402, 411, 414, 422, 427, 436, 448, 449, 457, 459, 466, 471, 480, 533, 536, 827, 904, 934, 936, 949, 955, 965, 972, 981

## Generated Slices

RunnerDashboard slices were generated under:

- `docs/audits/RUN-UI-1D-runner-dashboard-slices/`

These slices are for future safe extraction planning only.

## Guardrails for RUN UI-1D

Future runner UI checkpoints must preserve:

- runner online/offline behavior
- available run loading
- socket offer/unavailable/update behavior
- accept idempotency behavior
- stale offer cleanup behavior
- start authorization guard behavior
- arrived authorization guard behavior
- receipt proof flow
- delivery confirmation/PIN flow
- completion safety status
- budget/spend warning display
- requester secure hold/manual review protections
- all backend route behavior unless explicitly scoped

## Validation

PASS:

- clean or audit-only git status before rescue
- latest clean base confirmed at `c27c75b`
- UI-1B primitives confirmed
- UI-1C requester closeout confirmed
- `RunnerDashboard.jsx` present
- source hash no-change guard passed
- frontend lint passed
- frontend build passed
- backend Node syntax checks passed

## Explicit Non-Goals

This checkpoint does not:

- change `RunnerDashboard.jsx`
- change requester Dashboard UI
- change CSS
- add runner components
- change backend routes
- change Prisma/database schema
- change payment behavior
- change runner accept/start/arrived/complete behavior
- deploy production

## Recent Git Log

``text
c27c75b Close requester command center redesign lane
bf4ac04 Polish requester command center visuals
5d43468 Extract requester run list presentation
94b6d8c Extract requester overview intro
5734c9f Extract requester run overview presentation
dc460f4 Refine requester command center layout
6e929da Pass requester run data to command center
9ab8ca2 Wire requester command center preview
``

