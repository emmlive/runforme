# RUN UI-1J Checkpoint 1 - Next UI Milestone Selection Audit

## Status

AUDIT COMPLETE - implementation milestone not yet selected.

## Baseline

- Branch: main
- Baseline commit: 093f410
- Local main matched origin/main
- Execution environment: Windows

## Inventory

- Frontend source files: 52
- Likely page/dashboard surfaces: 5
- Candidate UI-debt signals: 65
- Recent RUN UI audits reviewed: 30
- Roadmap/disposition references: 24

## Page and Dashboard Surfaces

- frontend/src/App.jsx
- frontend/src/components/requester/RequesterRunOverview.jsx
- frontend/src/Dashboard.jsx
- frontend/src/pages/PaymentPage.tsx
- frontend/src/RunnerDashboard.jsx

## Candidate Signal Counts

- URL-related references: 33
- Browser prompt/alert references: 0
- Raw form-control references: 12
- Placeholder or unfinished-work references: 20

## Detailed Candidate Findings

- frontend/src/AdminDisputes.jsx:4 - URL - const API = import.meta.env.VITE_API_URL || "http://localhost:5050";
- frontend/src/AdminGovernance.jsx:4 - URL - const API = import.meta.env.VITE_API_URL || "http://localhost:5050";
- frontend/src/AdminGovernance.jsx:61 - URL - const url = window.URL.createObjectURL(blob);
- frontend/src/AdminGovernance.jsx:63 - URL - a.href = url;
- frontend/src/api/client.js:1 - URL - const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";
- frontend/src/api/client.js:6 - URL - const res = await fetch(`${API_URL}${endpoint}`, {
- frontend/src/App.jsx:10 - URL - const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";
- frontend/src/App.jsx:82 - URL - `${API_URL}/api/payments/create-intent`,
- frontend/src/components/PaymentModal.jsx:10 - URL - const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";
- frontend/src/components/PaymentModal.jsx:66 - URL - await fetch(`${API_URL}/api/payments/mark-authorized`, {
- frontend/src/components/requester/RequesterTrustTimeline.jsx:12 - placeholder - title: "Secure hold placeholder",
- frontend/src/Dashboard.jsx:8 - URL - const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";
- frontend/src/Dashboard.jsx:268 - URL - ["Receipt Proof", run.receiptImageUrl ? "Uploaded" : "Not uploaded"],
- frontend/src/Dashboard.jsx:511 - placeholder - this placeholder yet. Stripe PaymentIntent wiring will be added in a later security step.
- frontend/src/Dashboard.jsx:519 - placeholder - run.authorizationStatus === "placeholder_authorized"
- frontend/src/Dashboard.jsx:521 - placeholder - title="This uses the safe placeholder endpoint. No live charge is made."
- frontend/src/Dashboard.jsx:525 - placeholder - run.authorizationStatus === "placeholder_authorized"
- frontend/src/Dashboard.jsx:531 - placeholder - run.authorizationStatus === "placeholder_authorized"
- frontend/src/Dashboard.jsx:540 - placeholder - run.authorizationStatus === "placeholder_authorized"
- frontend/src/Dashboard.jsx:546 - placeholder - {run.authorizationStatus === "placeholder_authorized"
- frontend/src/Dashboard.jsx:547 - placeholder - ? "Secure Hold Placeholder Authorized"
- frontend/src/Dashboard.jsx:650 - URL - const response = await fetch(`${API_URL}/api/runs`, {
- frontend/src/Dashboard.jsx:746 - URL - const response = await fetch(`${API_URL}/api/runs`, {
- frontend/src/Dashboard.jsx:815 - URL - const response = await fetch(`${API_URL}/api/runs/${runId}/authorize-hold`, {
- frontend/src/Dashboard.jsx:832 - placeholder - showSuccess(data.message || "Secure hold placeholder authorized. No live charge was made.");
- frontend/src/Dashboard.jsx:854 - URL - const response = await fetch(`${API_URL}/api/runs/${runId}/manual-review/approve`, {
- frontend/src/Dashboard.jsx:910 - URL - requesterCommandActiveRun?.receiptUrl ||
- frontend/src/Dashboard.jsx:911 - URL - requesterCommandActiveRun?.receiptImageUrl
- frontend/src/Dashboard.jsx:924 - placeholder - title: "Secure hold placeholder",
- frontend/src/Dashboard.jsx:1096 - <input - <input
- frontend/src/Dashboard.jsx:1101 - placeholder - placeholder="Chicago Loop"
- frontend/src/Dashboard.jsx:1113 - <input - <input
- frontend/src/Dashboard.jsx:1118 - placeholder - placeholder="Pickup documents"
- frontend/src/Dashboard.jsx:1130 - <input - <input
- frontend/src/Dashboard.jsx:1148 - <input - <input
- frontend/src/Dashboard.jsx:1158 - placeholder - placeholder="0"
- frontend/src/Dashboard.jsx:1170 - <input - <input
- frontend/src/Dashboard.jsx:1188 - <input - <input
- frontend/src/lib/socket.js:3 - URL - const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";
- frontend/src/lib/socket.js:5 - URL - export const socket = io(API_URL, {
- frontend/src/Login.jsx:4 - URL - const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";
- frontend/src/Login.jsx:36 - URL - const res = await axios.post(`${API_URL}/api/auth/login`, {
- frontend/src/Login.jsx:69 - <input - <input
- frontend/src/Login.jsx:70 - placeholder - placeholder="Email"
- frontend/src/Login.jsx:76 - <input - <input
- frontend/src/Login.jsx:77 - placeholder - placeholder="Password"
- frontend/src/Login.jsx:84 - <select - <select value={role} onChange={(e) => setRole(e.target.value)}>
- frontend/src/RunnerDashboard.jsx:336 - https:// - return `https://runforme.local/receipt-images/${encodeURIComponent(id)}/${Date.now()}-${safeFileName}`;
- frontend/src/RunnerDashboard.jsx:347 - URL - receiptImageUrl: "",
- frontend/src/RunnerDashboard.jsx:361 - URL - receiptImageUrl: "",
- frontend/src/RunnerDashboard.jsx:378 - URL - receiptImageUrl: "",
- frontend/src/RunnerDashboard.jsx:398 - URL - receiptImageUrl: "",
- frontend/src/RunnerDashboard.jsx:412 - URL - receiptImageUrl: createReceiptPhotoReference(id, file.name),
- frontend/src/RunnerDashboard.jsx:425 - URL - receiptImageUrl: "",
- frontend/src/RunnerDashboard.jsx:433 - URL - reader.readAsDataURL(file);
- frontend/src/RunnerDashboard.jsx:439 - URL - const receiptImageUrl = String(proof.receiptImageUrl || "").trim();
- frontend/src/RunnerDashboard.jsx:446 - URL - if (!receiptImageUrl) {
- frontend/src/RunnerDashboard.jsx:462 - URL - body: { receiptAmount, receiptImageUrl },
- frontend/src/RunnerDashboard.jsx:781 - <input - <input
- frontend/src/RunnerDashboard.jsx:794 - placeholder - placeholder="Receipt amount"
- frontend/src/RunnerDashboard.jsx:830 - <input - <input
- frontend/src/RunnerDashboard.jsx:907 - <input - <input
- frontend/src/RunnerDashboard.jsx:915 - placeholder - placeholder="Enter delivery PIN"
- frontend/src/RunnerDashboard.jsx:1108 - placeholder - Current placeholder mode does not make a live card charge.
- frontend/src/RunnerDashboard.jsx:1147 - placeholder - Secure hold authorized by requester before this offer appeared. Placeholder mode only - no live card charge.

## Recent Audit Roadmap References

- docs/audits/RUN-UI-1I-checkpoint-4-milestone-closure.md:1: # RUN UI-1I Checkpoint 4 — Milestone Closure
- docs/audits/RUN-UI-1I-checkpoint-4-milestone-closure.md:3: ## Disposition
- docs/audits/RUN-UI-1I-checkpoint-4-milestone-closure.md:7: ## Milestone
- docs/audits/RUN-UI-1I-checkpoint-4-milestone-closure.md:48: ## Final Disposition
- docs/audits/RUN-UI-1I-checkpoint-4-milestone-closure.md:50: `RUN_UI_1I_COMPLETE_READY_FOR_NEXT_UI_MILESTONE`
- docs/audits/RUN-UI-1I-checkpoint-2C-receipt-photo-reference-bridge.md:78: ## Next Checkpoint
- docs/audits/RUN-UI-1I-checkpoint-2-runner-receipt-photo-upload-ui.md:75: ## Next Checkpoint
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/05-requester-receipt-proof-window.md:32: 240: function getNextStep(status) {
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/05-requester-receipt-proof-window.md:34: 242:   if (status === "assigned") return "Runner assigned. Next step: runner arrival.";
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/05-requester-receipt-proof-window.md:35: 243:   if (status === "arrived") return "Runner has arrived. Next step: completion.";
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/05-requester-receipt-proof-window.md:194: 604:         {getNextStep(run.status)}
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/02-backend-receipt-proof-search.md:90: - line 909: const nextReceiptStatus = exceedsMaxSpend ? "review_required" : "uploaded";
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/02-backend-receipt-proof-search.md:96: - line 939: receiptStatus: nextReceiptStatus,
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/02-backend-receipt-proof-search.md:137: - line 913: const nextRequiresManualReview =
- docs/audits/RUN-UI-1I-receipt-photo-upload-slices/02-backend-receipt-proof-search.md:140: - line 944: requiresManualReview: nextRequiresManualReview,
- docs/audits/RUN-UI-1I-receipt-photo-upload-current-state-audit.md:88: ## Next Checkpoint
- docs/audits/RUN-UI-1G-checkpoint-5-final-closeout.md:16: - Checkpoint 1/1A: mapped post-smoke remaining UI gaps.
- docs/audits/RUN-UI-1G-checkpoint-4-requester-dashboard-remaining-visual-polish.md:1: # RUN UI-1G Checkpoint 4 - requester dashboard remaining visual polish
- docs/audits/RUN-UI-1G-checkpoint-4-requester-dashboard-remaining-visual-polish.md:8: - Polished remaining requester dashboard visual surfaces after runner shell and LiveMap fallback work.
- docs/audits/RUN-UI-1G-checkpoint-1-post-smoke-remaining-ui-gap-map.md:1: # RUN UI-1G Checkpoint 1 - Post-Smoke Remaining UI Gap Map
- docs/audits/RUN-UI-1G-checkpoint-1-post-smoke-remaining-ui-gap-map.md:7: Checkpoint 1 opens the RUN UI-1G lane by mapping remaining legacy UI surfaces after the requester and runner command center work.
- docs/audits/RUN-UI-1G-checkpoint-1-post-smoke-remaining-ui-gap-map.md:22: ## Remaining Visual Gap Map
- docs/audits/RUN-UI-1G-checkpoint-1-post-smoke-remaining-ui-gap-map.md:24: The next UI work should focus on the remaining legacy surfaces around the new command centers:
- docs/audits/RUN-UI-1G-checkpoint-1-post-smoke-remaining-ui-gap-map.md:101: ## Recommended Next Checkpoints

## Decision Gate

Select one exact customer-facing workflow before RUN UI-1J implementation begins.

## Scope Confirmation

- Audit document only.
- No application source changes.
- No backend changes.
- No database schema changes.
- No commit or push performed.
- No deployment performed.

## Disposition

READY_FOR_RUN_UI_1J_SCOPE_SELECTION
