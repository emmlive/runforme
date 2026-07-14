# Slice: 02-backend-receipt-proof-search.md

## backend\src\config\db.js

- Pattern 'receipt': no matches
- Pattern 'receipt-proof': no matches
- Pattern 'receiptProof': no matches
- Pattern 'receiptProofUrl': no matches
- Pattern 'receiptUrl': no matches
- Pattern 'manualReview': no matches
- Pattern 'manual review': no matches
- Pattern 'maxRunnerSpend': no matches
- Pattern 'confirm-delivery': no matches
- Pattern 'complete': no matches

## backend\src\middleware\auth.js

- Pattern 'receipt': no matches
- Pattern 'receipt-proof': no matches
- Pattern 'receiptProof': no matches
- Pattern 'receiptProofUrl': no matches
- Pattern 'receiptUrl': no matches
- Pattern 'manualReview': no matches
- Pattern 'manual review': no matches
- Pattern 'maxRunnerSpend': no matches
- Pattern 'confirm-delivery': no matches
- Pattern 'complete': no matches

## backend\src\middleware\requireRole.js

- Pattern 'receipt': no matches
- Pattern 'receipt-proof': no matches
- Pattern 'receiptProof': no matches
- Pattern 'receiptProofUrl': no matches
- Pattern 'receiptUrl': no matches
- Pattern 'manualReview': no matches
- Pattern 'manual review': no matches
- Pattern 'maxRunnerSpend': no matches
- Pattern 'confirm-delivery': no matches
- Pattern 'complete': no matches

## backend\src\routes\protected.js

- Pattern 'receipt': no matches
- Pattern 'receipt-proof': no matches
- Pattern 'receiptProof': no matches
- Pattern 'receiptProofUrl': no matches
- Pattern 'receiptUrl': no matches
- Pattern 'manualReview': no matches
- Pattern 'manual review': no matches
- Pattern 'maxRunnerSpend': no matches
- Pattern 'confirm-delivery': no matches
- Pattern 'complete': no matches

## backend\src\routes\runners.js

- Pattern 'receipt': no matches
- Pattern 'receipt-proof': no matches
- Pattern 'receiptProof': no matches
- Pattern 'receiptProofUrl': no matches
- Pattern 'receiptUrl': no matches
- Pattern 'manualReview': no matches
- Pattern 'manual review': no matches
- Pattern 'maxRunnerSpend': no matches
- Pattern 'confirm-delivery': no matches
- Pattern 'complete': no matches

## backend\src\routes\runs.js

- Pattern 'receipt': 59 match(es)
  - line 240: receiptStatus: "not_uploaded",
  - line 829: RECEIPT / PURCHASE PROOF
  - line 831: router.post("/:runId/receipt-proof", auth, async (req, res) => {
  - line 834: const receiptAmount = Number(req.body.receiptAmount);
  - line 835: const receiptImageUrl = String(
  - line 836: req.body.receiptImageUrl || req.body.proofUrl || ""
  - line 846: error: "Only the assigned runner can submit receipt proof",
  - line 850: if (!Number.isInteger(receiptAmount) || receiptAmount <= 0 || receiptAmount > 10000) {
  - line 853: error: "Receipt amount must be a whole dollar amount between $1 and $10000",
  - line 857: if (!receiptImageUrl || receiptImageUrl.length > 2048) {
  - line 860: error: "Receipt proof URL is required",
  - line 885: error: "Receipt proof can only be submitted before completion",
  - line 889: const receiptAlreadySubmitted =
  - line 890: ["uploaded", "review_required"].includes(existing.receiptStatus) ||
  - line 891: Boolean(existing.receiptImageUrl);
  - line 893: if (receiptAlreadySubmitted) {
  - line 897: message: "Receipt proof has already been submitted for this run",
  - line 903: const exceedsMaxSpend = maxRunnerSpend > 0 && receiptAmount > maxRunnerSpend;
  - line 905: receiptAmount +
  - line 909: const nextReceiptStatus = exceedsMaxSpend ? "review_required" : "uploaded";
  - line 911: ? "receipt_review_required"
  - line 912: : "receipt_uploaded";
  - line 916: ? addRiskFlag(existing.riskFlags, "receipt_exceeds_max_runner_spend")
  - line 927: const receiptUpdate = await prisma.run.updateMany({
  - line 932: receiptStatus: { notIn: ["uploaded", "review_required"] },
  - line 939: receiptStatus: nextReceiptStatus,
  - line 940: receiptAmount,
  - line 941: receiptImageUrl,
  - line 953: if (receiptUpdate.count !== 1) {
  - line 956: (["uploaded", "review_required"].includes(updatedRun.receiptStatus) ||
  - line 957: Boolean(updatedRun.receiptImageUrl));
  - line 963: message: "Receipt proof has already been submitted for this run",
  - line 970: error: "Receipt proof could not be submitted because the run state changed",
  - line 977: io.to(`run:${runId}`).emit("run.receipt_uploaded", {
  - line 996: console.error("RECEIPT PROOF ERROR:", err);
  - line 999: error: "Failed to submit receipt proof",
  - line 1070: const receiptIsRequired = Number(existing.maxRunnerSpend || 0) > 0;
  - line 1071: const receiptIsUploaded = existing.receiptStatus === "uploaded";
  - line 1074: existing.receiptStatus === "review_required";
  - line 1077: : receiptIsRequired && !receiptIsUploaded
  - line 1078: ? "awaiting_receipt"
  - line 1177: if (!existing.requiresManualReview && existing.receiptStatus !== "review_required") {
  - line 1195: receiptStatus: existing.receiptStatus,
  - line 1202: { receiptStatus: "review_required" },
  - line 1207: receiptStatus:
  - line 1208: existing.receiptStatus === "review_required"
  - line 1210: : existing.receiptStatus,
  - line 1212: existing.purchaseStatus === "receipt_review_required"
  - line 1213: ? "receipt_uploaded"
  - line 1226: updatedRun.receiptStatus !== "review_required"
  - line 1330: existing.receiptStatus === "review_required" ||
  - line 1339: const receiptIsRequired = Number(existing.maxRunnerSpend || 0) > 0;
  - line 1340: const receiptIsUploaded = existing.receiptStatus === "uploaded";
  - line 1342: if (receiptIsRequired && !receiptIsUploaded) {
  - line 1345: error: "Receipt proof must be submitted before completion",
  - line 1351: existing.receiptStatus === "review_required";
  - line 1354: : receiptIsRequired && !receiptIsUploaded
  - line 1355: ? "awaiting_receipt"
  - line 1364: receiptStatus: receiptIsRequired ? "uploaded" : { not: "review_required" },
- Pattern 'receipt-proof': 1 match(es)
  - line 831: router.post("/:runId/receipt-proof", auth, async (req, res) => {
- Pattern 'receiptProof': no matches
- Pattern 'receiptProofUrl': no matches
- Pattern 'receiptUrl': no matches
- Pattern 'manualReview': 16 match(es)
  - line 244: requiresManualReview: false,
  - line 913: const nextRequiresManualReview =
  - line 914: Boolean(existing.requiresManualReview) || exceedsMaxSpend;
  - line 933: requiresManualReview: Boolean(existing.requiresManualReview),
  - line 944: requiresManualReview: nextRequiresManualReview,
  - line 1073: Boolean(existing.requiresManualReview) ||
  - line 1177: if (!existing.requiresManualReview && existing.receiptStatus !== "review_required") {
  - line 1190: const manualReviewUpdate = await prisma.run.updateMany({
  - line 1194: requiresManualReview: Boolean(existing.requiresManualReview),
  - line 1201: { requiresManualReview: true },
  - line 1206: requiresManualReview: false,
  - line 1222: if (manualReviewUpdate.count !== 1) {
  - line 1225: !updatedRun.requiresManualReview &&
  - line 1329: existing.requiresManualReview ||
  - line 1350: Boolean(existing.requiresManualReview) ||
  - line 1363: requiresManualReview: false,
- Pattern 'manual review': 6 match(es)
  - line 1145: MANUAL REVIEW APPROVAL
  - line 1173: error: "Only the requester can approve manual review for this run",
  - line 1237: error: "Manual review could not be approved because the run state changed",
  - line 1265: console.error("MANUAL REVIEW APPROVAL ERROR:", err);
  - line 1268: error: "Failed to approve manual review",
  - line 1335: error: "Manual review must be approved before completion",
- Pattern 'maxRunnerSpend': 7 match(es)
  - line 183: const maxRunnerSpend = itemBudgetEstimate + bufferAmount;
  - line 198: maxRunnerSpend,
  - line 238: maxRunnerSpend,
  - line 902: const maxRunnerSpend = Number(existing.maxRunnerSpend || 0);
  - line 903: const exceedsMaxSpend = maxRunnerSpend > 0 && receiptAmount > maxRunnerSpend;
  - line 1070: const receiptIsRequired = Number(existing.maxRunnerSpend || 0) > 0;
  - line 1339: const receiptIsRequired = Number(existing.maxRunnerSpend || 0) > 0;
- Pattern 'confirm-delivery': 1 match(es)
  - line 1007: router.post("/:runId/confirm-delivery", auth, async (req, res) => {
- Pattern 'complete': 14 match(es)
  - line 581: START / COMPLETE
  - line 1273: async function completeRun(req, res) {
  - line 1284: error: "Only the assigned runner can complete this run",
  - line 1306: if (existing.status === "completed") {
  - line 1309: alreadyCompleted: true,
  - line 1371: status: "completed",
  - line 1374: ? "completed"
  - line 1383: if (updatedRun && updatedRun.status === "completed") {
  - line 1386: alreadyCompleted: true,
  - line 1400: io.to(`run:${runId}`).emit("run.completed", {
  - line 1419: console.error("COMPLETE RUN ERROR:", err);
  - line 1422: error: err.message || "Failed to complete run",
  - line 1427: router.post("/:runId/complete", auth, completeRun);
  - line 1428: router.patch("/:runId/complete", auth, completeRun);

## backend\src\routes\webhooks.js

- Pattern 'receipt': no matches
- Pattern 'receipt-proof': no matches
- Pattern 'receiptProof': no matches
- Pattern 'receiptProofUrl': no matches
- Pattern 'receiptUrl': no matches
- Pattern 'manualReview': no matches
- Pattern 'manual review': no matches
- Pattern 'maxRunnerSpend': no matches
- Pattern 'confirm-delivery': no matches
- Pattern 'complete': no matches

## backend\src\app.js

- Pattern 'receipt': no matches
- Pattern 'receipt-proof': no matches
- Pattern 'receiptProof': no matches
- Pattern 'receiptProofUrl': no matches
- Pattern 'receiptUrl': no matches
- Pattern 'manualReview': no matches
- Pattern 'manual review': no matches
- Pattern 'maxRunnerSpend': no matches
- Pattern 'confirm-delivery': no matches
- Pattern 'complete': no matches

## backend\src\server.js

- Pattern 'receipt': no matches
- Pattern 'receipt-proof': no matches
- Pattern 'receiptProof': no matches
- Pattern 'receiptProofUrl': no matches
- Pattern 'receiptUrl': no matches
- Pattern 'manualReview': no matches
- Pattern 'manual review': no matches
- Pattern 'maxRunnerSpend': no matches
- Pattern 'confirm-delivery': no matches
- Pattern 'complete': no matches

