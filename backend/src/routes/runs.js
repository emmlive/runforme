const express = require("express");
const prisma = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();

const CREATE_RUN_DUPLICATE_WINDOW_MS = 15_000;

console.log("🚨 ACTIVE JS RUNS ROUTE LOADED");

function parseRunId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function generateDeliveryPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function readSafeMoney(value, fallback = 0) {
  const amount = Number(value ?? fallback);
  return Number.isInteger(amount) && amount >= 0 ? amount : null;
}

function redactRunForRunner(run) {
  if (!run) return run;

  const { deliveryPin, ...safeRun } = run;
  return safeRun;
}

function parseRiskFlags(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function addRiskFlag(existingFlags, flag) {
  const flags = parseRiskFlags(existingFlags);

  if (!flags.includes(flag)) {
    flags.push(flag);
  }

  return JSON.stringify(flags);
}

function requiresHoldAuthorization(run) {
  return (
    Number(run?.itemBudgetEstimate || 0) > 0 &&
    run?.authorizationStatus !== "placeholder_authorized"
  );
}

/* ============================
   GET RUNS
============================ */
router.get("/", auth, async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    if (role === "runner") {
      const pendingOffers = await prisma.offer.findMany({
        where: {
          runnerId: userId,
          status: "pending",
        },
        include: { run: true },
        orderBy: { createdAt: "desc" },
      });

      const offeredRuns = pendingOffers
        .filter(
          (offer) =>
            offer.run &&
            offer.run.status === "open" &&
            !requiresHoldAuthorization(offer.run)
        )
        .map((offer) =>
          redactRunForRunner({
            ...offer.run,
            offerId: offer.id,
          })
        );

      const assignedRuns = await prisma.run.findMany({
        where: {
          assignedRunnerId: userId,
          status: { in: ["assigned", "arrived", "in_progress"] },
        },
        orderBy: { createdAt: "desc" },
      });

      const byId = new Map();
      [...assignedRuns.map(redactRunForRunner), ...offeredRuns].forEach((run) => {
        byId.set(run.id, run);
      });

      return res.json({
        success: true,
        runs: Array.from(byId.values()),
      });
    }

    if (role === "requester") {
      const runs = await prisma.run.findMany({
        where: { requesterId: userId },
        orderBy: { createdAt: "desc" },
      });

      return res.json({ success: true, runs });
    }

    return res.status(403).json({
      success: false,
      error: "Unsupported role",
    });
  } catch (err) {
    console.error("❌ GET RUNS ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to load runs",
    });
  }
});

/* ============================
   CREATE RUN
============================ */
router.post("/", auth, async (req, res) => {
  try {
    console.log("➡️ CREATE RUN HIT");

    if (req.user.role !== "requester") {
      return res.status(403).json({
        success: false,
        error: "Only requesters can create runs",
      });
    }

    const { location, item, payout } = req.body;
    const locationText = String(location || "").trim();
    const itemText = String(item || "").trim();
    const itemBudgetEstimate = readSafeMoney(req.body.itemBudgetEstimate, 0);
    const platformFee = readSafeMoney(req.body.platformFee, 0);
    const bufferAmount = readSafeMoney(req.body.bufferAmount, 0);

    if (!locationText || !itemText) {
      return res.status(400).json({
        success: false,
        error: "location and item are required",
      });
    }

    const safePayout = Number(payout);

    if (!Number.isInteger(safePayout) || safePayout < 5 || safePayout > 1000) {
      return res.status(400).json({
        success: false,
        error: "Payout must be between $5 and $1000",
      });
    }

    if (
      itemBudgetEstimate === null ||
      platformFee === null ||
      bufferAmount === null ||
      itemBudgetEstimate > 5000 ||
      platformFee > 1000 ||
      bufferAmount > 1000
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid budget, platform fee, or buffer amount",
      });
    }

    const holdAmount =
      itemBudgetEstimate + safePayout + platformFee + bufferAmount;
    const maxRunnerSpend = itemBudgetEstimate + bufferAmount;
    const purchaseStatus =
      itemBudgetEstimate > 0 ? "budget_pending" : "not_required";

    const duplicateSince = new Date(Date.now() - CREATE_RUN_DUPLICATE_WINDOW_MS);
    const duplicateRun = await prisma.run.findFirst({
      where: {
        requesterId: req.user.id,
        location: locationText,
        item: itemText,
        payout: safePayout,
        itemBudgetEstimate,
        platformFee,
        bufferAmount,
        holdAmount,
        maxRunnerSpend,
        status: { in: ["open", "assigned", "arrived", "in_progress"] },
        createdAt: { gte: duplicateSince },
      },
      include: {
        offers: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (duplicateRun) {
      const { offers = [], ...run } = duplicateRun;

      return res.status(200).json({
        success: true,
        duplicate: true,
        alreadyCreated: true,
        run,
        offersCreated: offers.length,
        queued: true,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const run = await tx.run.create({
        data: {
          requesterId: req.user.id,
          location: locationText,
          item: itemText,
          payout: safePayout,
          status: "open",

          authorizationStatus: "not_required_dev",
          itemBudgetEstimate,
          runnerPayout: safePayout,
          platformFee,
          bufferAmount,
          holdAmount,
          maxRunnerSpend,
          purchaseStatus,
          receiptStatus: "not_uploaded",
          deliveryPin: generateDeliveryPin(),
          riskScore: 0,
          riskFlags: "[]",
          requiresManualReview: false,
          payoutStatus: "not_started",
        },
      });

      const runners = await tx.user.findMany({
        where: { role: "runner" },
        select: { id: true },
      });

      const offers = await Promise.all(
        runners.map((runner) =>
          tx.offer.create({
            data: {
              runId: run.id,
              runnerId: runner.id,
              message: "New run available",
              status: "pending",
            },
          })
        )
      );

      return { run, offers };
    });

    console.log(`✅ Run created: ${result.run.id}`);
    console.log(`📨 Offers created: ${result.offers.length}`);

    const io = req.app.get("io");

    if (io && !requiresHoldAuthorization(result.run)) {
      result.offers.forEach((offer) => {
        io.to(`runner:${offer.runnerId}`).emit("run.offer", {
          run: redactRunForRunner({
            ...result.run,
            offerId: offer.id,
          }),
          offer,
        });
      });
    }

    return res.status(201).json({
      success: true,
      run: result.run,
      offersCreated: result.offers.length,
      queued: true,
    });
  } catch (err) {
    console.error("❌ CREATE RUN ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to create run",
    });
  }
});

/* ============================
   ACCEPT RUN
============================ */
router.post("/:runId/accept", auth, async (req, res) => {
  console.log("🚨 ACCEPT ROUTE HIT");

  const runId = parseRunId(req.params.runId);
  const runnerId = req.user.id;

  try {
    if (req.user.role !== "runner") {
      return res.status(403).json({
        success: false,
        error: "Only runners can accept runs",
      });
    }

    if (!runId) {
      return res.status(400).json({
        success: false,
        error: "Invalid runId",
      });
    }

    let rejectedOffers = [];
    let alreadyAccepted = false;

    const updatedRun = await prisma.$transaction(async (tx) => {
      const existing = await tx.run.findUnique({
        where: { id: runId },
      });

      console.log("🧠 RUN BEFORE ACCEPT:", existing);

      if (!existing) {
        throw new Error("Run not found");
      }

      if (existing.assignedRunnerId === runnerId) {
        alreadyAccepted = true;
        return existing;
      }

      if (existing.assignedRunnerId) {
        throw new Error("Run already assigned");
      }

      if (existing.status !== "open") {
        throw new Error(`Run not valid for accept: ${existing.status}`);
      }

      if (requiresHoldAuthorization(existing)) {
        throw new Error("Secure hold authorization is required before this run can be accepted");
      }

      const offer = await tx.offer.findFirst({
        where: {
          runId,
          runnerId,
          status: "pending",
        },
        orderBy: { createdAt: "desc" },
      });

      console.log("🔍 Found offer:", offer);

      if (!offer) {
        throw new Error("No valid pending offer found for this runner");
      }

      await tx.offer.update({
        where: { id: offer.id },
        data: { status: "accepted" },
      });

      rejectedOffers = await tx.offer.findMany({
        where: {
          runId,
          id: { not: offer.id },
          status: "pending",
        },
        select: {
          id: true,
          runnerId: true,
        },
      });

      await tx.offer.updateMany({
        where: {
          runId,
          id: { not: offer.id },
          status: "pending",
        },
        data: { status: "rejected" },
      });

      return tx.run.update({
        where: { id: runId },
        data: {
          status: "assigned",
          assignedRunnerId: runnerId,
          paymentStatus: existing.paymentStatus || "pending_payment_method",
        },
      });
    });

    if (alreadyAccepted) {
      return res.json({
        success: true,
        alreadyAccepted: true,
        run: redactRunForRunner(updatedRun),
      });
    }

    console.log(`✅ Run ${runId} accepted by runner ${runnerId}`);

    const io = req.app.get("io");

    if (io) {
      io.to(`run:${runId}`).emit("run.assigned", {
        runId,
        runnerId,
      });

      io.to(`runner:${runnerId}`).emit("run.updated", {
        run: redactRunForRunner(updatedRun),
      });

      rejectedOffers.forEach((rejectedOffer) => {
        io.to(`runner:${rejectedOffer.runnerId}`).emit("run.unavailable", {
          runId,
          offerId: rejectedOffer.id,
          reason: "Run accepted by another runner",
        });
      });

      io.to(`requester:${updatedRun.requesterId}`).emit("run.updated", {
        run: updatedRun,
      });
    }

    return res.json({
      success: true,
      run: req.user.role === "runner" ? redactRunForRunner(updatedRun) : updatedRun,
    });
  } catch (err) {
    console.error("❌ ACCEPT ERROR:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to accept run",
    });
  }
});

/* ============================
   ARRIVED
============================ */
router.post("/:runId/arrived", auth, async (req, res) => {
  try {
    const runId = parseRunId(req.params.runId);

    if (!runId) {
      return res.status(400).json({ success: false, error: "Invalid runId" });
    }

    if (req.user.role !== "runner") {
      return res.status(403).json({
        success: false,
        error: "Only the assigned runner can mark arrival",
      });
    }

    const existing = await prisma.run.findUnique({
      where: { id: runId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Run not found",
      });
    }

    if (existing.assignedRunnerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "This run is not assigned to you",
      });
    }

    if (["arrived", "in_progress"].includes(existing.status)) {
      return res.json({
        success: true,
        alreadyArrived: true,
        run: redactRunForRunner(existing),
      });
    }

    if (existing.status !== "assigned") {
      return res.status(400).json({
        success: false,
        error: "Run must be assigned before arrival can be marked",
      });
    }

    const updateResult = await prisma.run.updateMany({
      where: {
        id: runId,
        assignedRunnerId: req.user.id,
        status: "assigned",
      },
      data: { status: "arrived" },
    });

    const updatedRun = await prisma.run.findUnique({ where: { id: runId } });

    if (updateResult.count !== 1) {
      if (updatedRun && ["arrived", "in_progress"].includes(updatedRun.status)) {
        return res.json({
          success: true,
          alreadyArrived: true,
          run: redactRunForRunner(updatedRun),
        });
      }

      return res.status(400).json({
        success: false,
        error: "Run must be assigned before arrival can be marked",
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.to(`run:${runId}`).emit("run.updated", { run: updatedRun });
      io.to(`runner:${req.user.id}`).emit("run.updated", {
        run: redactRunForRunner(updatedRun),
      });
      io.to(`requester:${updatedRun.requesterId}`).emit("run.updated", {
        run: updatedRun,
      });
    }

    return res.json({
      success: true,
      run: redactRunForRunner(updatedRun),
    });
  } catch (err) {
    console.error("ARRIVED ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to mark arrived",
    });
  }
});


/* ============================
   START / COMPLETE
============================ */
router.patch("/:runId/start", auth, async (req, res) => {
  try {
    const runId = parseRunId(req.params.runId);

    if (!runId) {
      return res.status(400).json({ success: false, error: "Invalid runId" });
    }

    if (req.user.role !== "runner") {
      return res.status(403).json({
        success: false,
        error: "Only the assigned runner can start this run",
      });
    }

    const existing = await prisma.run.findUnique({
      where: { id: runId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Run not found",
      });
    }

    if (existing.assignedRunnerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "This run is not assigned to you",
      });
    }

    if (existing.status === "in_progress") {
      return res.json({
        success: true,
        alreadyStarted: true,
        run: redactRunForRunner(existing),
      });
    }

    if (!["assigned", "arrived"].includes(existing.status)) {
      return res.status(400).json({
        success: false,
        error: "Run must be assigned or arrived before it can be started",
      });
    }

    const updatedRun = await prisma.run.update({
      where: { id: runId },
      data: { status: "in_progress" },
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`run:${runId}`).emit("run.updated", { run: updatedRun });
      io.to(`runner:${req.user.id}`).emit("run.updated", {
        run: redactRunForRunner(updatedRun),
      });
      io.to(`requester:${updatedRun.requesterId}`).emit("run.updated", {
        run: updatedRun,
      });
    }

    return res.json({
      success: true,
      run: redactRunForRunner(updatedRun),
    });
  } catch (err) {
    console.error("START RUN ERROR:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to start run",
    });
  }
});





/* ============================
   AUTHORIZE SECURE HOLD PLACEHOLDER
============================ */
router.post("/:runId/authorize-hold", auth, async (req, res) => {
  try {
    const runId = parseRunId(req.params.runId);

    if (!runId) {
      return res.status(400).json({ success: false, error: "Invalid runId" });
    }

    const existing = await prisma.run.findUnique({
      where: { id: runId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Run not found",
      });
    }

    const canAuthorize =
      req.user.role === "admin" ||
      (req.user.role === "requester" && existing.requesterId === req.user.id);

    if (!canAuthorize) {
      return res.status(403).json({
        success: false,
        error: "Only the requester can authorize the secure hold for this run",
      });
    }

    if (Number(existing.holdAmount || 0) <= 0) {
      return res.status(400).json({
        success: false,
        error: "This run does not require a secure hold",
      });
    }

    if (existing.authorizationStatus === "placeholder_authorized") {
      return res.json({
        success: true,
        alreadyAuthorized: true,
        placeholder: true,
        charged: false,
        message: "Secure hold placeholder is already authorized. No live charge was made.",
        run: existing,
      });
    }

    const updatedRun = await prisma.run.update({
      where: { id: runId },
      data: {
        authorizationStatus: "placeholder_authorized",
        paymentStatus: "hold_placeholder",
        riskFlags: addRiskFlag(existing.riskFlags, "payment_hold_placeholder_authorized"),
      },
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`run:${runId}`).emit("run.hold_placeholder_authorized", {
        runId,
        requesterId: req.user.id,
      });

      if (updatedRun.assignedRunnerId) {
        io.to(`runner:${updatedRun.assignedRunnerId}`).emit("run.updated", {
          run: redactRunForRunner(updatedRun),
        });
      }

      io.to(`requester:${updatedRun.requesterId}`).emit("run.updated", {
        run: updatedRun,
      });

      // Dispatch pending offers after secure hold authorization.
      if (!updatedRun.assignedRunnerId && updatedRun.status === "open") {
        const pendingOffers = await prisma.offer.findMany({
          where: {
            runId,
            status: "pending",
          },
        });

        pendingOffers.forEach((offer) => {
          io.to(`runner:${offer.runnerId}`).emit("run.offer", {
            run: redactRunForRunner({
              ...updatedRun,
              offerId: offer.id,
            }),
            offer,
          });
        });
      }
    }

    return res.json({
      success: true,
      placeholder: true,
      charged: false,
      message: "Secure hold placeholder authorized. No live charge was made.",
      run: updatedRun,
    });
  } catch (err) {
    console.error("AUTHORIZE HOLD PLACEHOLDER ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to authorize secure hold placeholder",
    });
  }
});

/* ============================
   RECEIPT / PURCHASE PROOF
============================ */
router.post("/:runId/receipt-proof", auth, async (req, res) => {
  try {
    const runId = parseRunId(req.params.runId);
    const receiptAmount = Number(req.body.receiptAmount);
    const receiptImageUrl = String(
      req.body.receiptImageUrl || req.body.proofUrl || ""
    ).trim();

    if (!runId) {
      return res.status(400).json({ success: false, error: "Invalid runId" });
    }

    if (req.user.role !== "runner") {
      return res.status(403).json({
        success: false,
        error: "Only the assigned runner can submit receipt proof",
      });
    }

    if (!Number.isInteger(receiptAmount) || receiptAmount <= 0 || receiptAmount > 10000) {
      return res.status(400).json({
        success: false,
        error: "Receipt amount must be a whole dollar amount between $1 and $10000",
      });
    }

    if (!receiptImageUrl || receiptImageUrl.length > 2048) {
      return res.status(400).json({
        success: false,
        error: "Receipt proof URL is required",
      });
    }

    const existing = await prisma.run.findUnique({
      where: { id: runId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Run not found",
      });
    }

    if (existing.assignedRunnerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "This run is not assigned to you",
      });
    }

    if (!["assigned", "arrived", "in_progress"].includes(existing.status)) {
      return res.status(400).json({
        success: false,
        error: "Receipt proof can only be submitted before completion",
      });
    }

    const receiptAlreadySubmitted =
      ["uploaded", "review_required"].includes(existing.receiptStatus) ||
      Boolean(existing.receiptImageUrl);

    if (receiptAlreadySubmitted) {
      return res.json({
        success: true,
        alreadySubmitted: true,
        message: "Receipt proof has already been submitted for this run",
        run: redactRunForRunner(existing),
      });
    }

    const maxRunnerSpend = Number(existing.maxRunnerSpend || 0);
    const exceedsMaxSpend = maxRunnerSpend > 0 && receiptAmount > maxRunnerSpend;
    const finalAmount =
      receiptAmount +
      Number(existing.runnerPayout || existing.payout || 0) +
      Number(existing.platformFee || 0);

    const nextReceiptStatus = exceedsMaxSpend ? "review_required" : "uploaded";
    const nextPurchaseStatus = exceedsMaxSpend
      ? "receipt_review_required"
      : "receipt_uploaded";
    const nextRequiresManualReview =
      Boolean(existing.requiresManualReview) || exceedsMaxSpend;
    const nextRiskFlags = exceedsMaxSpend
      ? addRiskFlag(existing.riskFlags, "receipt_exceeds_max_runner_spend")
      : existing.riskFlags || "[]";
    const nextRiskScore = exceedsMaxSpend
      ? Math.min(100, Number(existing.riskScore || 0) + 25)
      : Number(existing.riskScore || 0);
    const nextPayoutStatus = exceedsMaxSpend
      ? "manual_review_required"
      : existing.deliveryConfirmedAt
        ? "ready_for_payout"
        : "proof_uploaded";

    const updatedRun = await prisma.run.update({
      where: { id: runId },
      data: {
        receiptStatus: nextReceiptStatus,
        receiptAmount,
        receiptImageUrl,
        finalAmount,
        purchaseStatus: nextPurchaseStatus,
        requiresManualReview: nextRequiresManualReview,
        riskFlags: nextRiskFlags,
        riskScore: nextRiskScore,
        payoutStatus: nextPayoutStatus,
      },
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`run:${runId}`).emit("run.receipt_uploaded", {
        runId,
        runnerId: req.user.id,
      });

      io.to(`runner:${req.user.id}`).emit("run.updated", {
        run: redactRunForRunner(updatedRun),
      });

      io.to(`requester:${updatedRun.requesterId}`).emit("run.updated", {
        run: updatedRun,
      });
    }

    return res.json({
      success: true,
      run: redactRunForRunner(updatedRun),
    });
  } catch (err) {
    console.error("RECEIPT PROOF ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to submit receipt proof",
    });
  }
});

/* ============================
   CONFIRM DELIVERY PIN
============================ */
router.post("/:runId/confirm-delivery", auth, async (req, res) => {
  try {
    const runId = parseRunId(req.params.runId);
    const submittedPin = String(req.body.deliveryPin || req.body.pin || "").trim();

    if (!runId) {
      return res.status(400).json({ success: false, error: "Invalid runId" });
    }

    if (req.user.role !== "runner") {
      return res.status(403).json({
        success: false,
        error: "Only the assigned runner can confirm delivery",
      });
    }

    const existing = await prisma.run.findUnique({
      where: { id: runId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Run not found",
      });
    }

    if (existing.assignedRunnerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "This run is not assigned to you",
      });
    }

    if (existing.deliveryConfirmedAt) {
      return res.json({
        success: true,
        alreadyConfirmed: true,
        run: redactRunForRunner(existing),
      });
    }

    if (!["arrived", "in_progress"].includes(existing.status)) {
      return res.status(400).json({
        success: false,
        error: "Run must be arrived before delivery can be confirmed",
      });
    }

    if (!submittedPin) {
      return res.status(400).json({
        success: false,
        error: "Delivery PIN is required",
      });
    }

    if (!existing.deliveryPin || existing.deliveryPin !== submittedPin) {
      return res.status(400).json({
        success: false,
        error: "Invalid delivery PIN",
      });
    }

    const receiptIsRequired = Number(existing.maxRunnerSpend || 0) > 0;
    const receiptIsUploaded = existing.receiptStatus === "uploaded";
    const reviewRequired =
      Boolean(existing.requiresManualReview) ||
      existing.receiptStatus === "review_required";
    const nextPayoutStatus = reviewRequired
      ? "manual_review_required"
      : receiptIsRequired && !receiptIsUploaded
        ? "awaiting_receipt"
        : "ready_for_payout";

    const deliveryUpdate = await prisma.run.updateMany({
      where: {
        id: runId,
        assignedRunnerId: req.user.id,
        status: { in: ["arrived", "in_progress"] },
        deliveryPin: submittedPin,
        deliveryConfirmedAt: null,
      },
      data: {
        deliveryConfirmedAt: new Date(),
        purchaseStatus: "delivered",
        payoutStatus: nextPayoutStatus,
      },
    });

    const updatedRun = await prisma.run.findUnique({ where: { id: runId } });

    if (deliveryUpdate.count !== 1) {
      if (updatedRun?.deliveryConfirmedAt) {
        return res.json({
          success: true,
          alreadyConfirmed: true,
          run: redactRunForRunner(updatedRun),
        });
      }

      return res.status(409).json({
        success: false,
        error: "Delivery could not be confirmed because the run state changed",
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.to(`run:${runId}`).emit("run.delivery_confirmed", {
        runId,
        runnerId: req.user.id,
      });

      io.to(`runner:${req.user.id}`).emit("run.updated", {
        run: redactRunForRunner(updatedRun),
      });

      io.to(`requester:${updatedRun.requesterId}`).emit("run.updated", {
        run: updatedRun,
      });
    }

    return res.json({
      success: true,
      run: req.user.role === "runner" ? redactRunForRunner(updatedRun) : updatedRun,
    });
  } catch (err) {
    console.error("CONFIRM DELIVERY ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to confirm delivery",
    });
  }
});


/* ============================
   MANUAL REVIEW APPROVAL
============================ */
router.post("/:runId/manual-review/approve", auth, async (req, res) => {
  try {
    const runId = parseRunId(req.params.runId);

    if (!runId) {
      return res.status(400).json({ success: false, error: "Invalid runId" });
    }

    const existing = await prisma.run.findUnique({
      where: { id: runId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Run not found",
      });
    }

    const canApprove =
      req.user.role === "admin" ||
      (req.user.role === "requester" && existing.requesterId === req.user.id);

    if (!canApprove) {
      return res.status(403).json({
        success: false,
        error: "Only the requester can approve manual review for this run",
      });
    }

    if (!existing.requiresManualReview && existing.receiptStatus !== "review_required") {
      return res.json({
        success: true,
        alreadyApproved: true,
        run: existing,
      });
    }

    const nextRiskFlags = addRiskFlag(existing.riskFlags, "manual_review_approved");
    const nextPayoutStatus = existing.deliveryConfirmedAt
      ? "ready_for_payout"
      : "proof_uploaded";

    const updatedRun = await prisma.run.update({
      where: { id: runId },
      data: {
        requiresManualReview: false,
        receiptStatus:
          existing.receiptStatus === "review_required"
            ? "uploaded"
            : existing.receiptStatus,
        purchaseStatus:
          existing.purchaseStatus === "receipt_review_required"
            ? "receipt_uploaded"
            : existing.purchaseStatus,
        payoutStatus: nextPayoutStatus,
        riskFlags: nextRiskFlags,
      },
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`run:${runId}`).emit("run.manual_review_approved", {
        runId,
        requesterId: req.user.id,
      });

      if (updatedRun.assignedRunnerId) {
        io.to(`runner:${updatedRun.assignedRunnerId}`).emit("run.updated", {
          run: redactRunForRunner(updatedRun),
        });
      }

      io.to(`requester:${updatedRun.requesterId}`).emit("run.updated", {
        run: updatedRun,
      });
    }

    return res.json({
      success: true,
      run: updatedRun,
    });
  } catch (err) {
    console.error("MANUAL REVIEW APPROVAL ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to approve manual review",
    });
  }
});

async function completeRun(req, res) {
  try {
    const runId = parseRunId(req.params.runId);

    if (!runId) {
      return res.status(400).json({ success: false, error: "Invalid runId" });
    }

    if (req.user.role !== "runner") {
      return res.status(403).json({
        success: false,
        error: "Only the assigned runner can complete this run",
      });
    }

    const existing = await prisma.run.findUnique({
      where: { id: runId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Run not found",
      });
    }

    if (existing.assignedRunnerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "This run is not assigned to you",
      });
    }

    if (existing.status === "completed") {
      return res.json({
        success: true,
        alreadyCompleted: true,
        run: redactRunForRunner(existing),
      });
    }

    if (!["arrived", "in_progress"].includes(existing.status)) {
      return res.status(400).json({
        success: false,
        error: "Run must be arrived before completion",
      });
    }

    if (!existing.deliveryConfirmedAt) {
      return res.status(400).json({
        success: false,
        error: "Delivery PIN must be confirmed before completion",
      });
    }

    if (
      existing.requiresManualReview ||
      existing.receiptStatus === "review_required" ||
      existing.payoutStatus === "manual_review_required"
    ) {
      return res.status(400).json({
        success: false,
        error: "Manual review must be approved before completion",
      });
    }

    const receiptIsRequired = Number(existing.maxRunnerSpend || 0) > 0;
    const receiptIsUploaded = existing.receiptStatus === "uploaded";

    if (receiptIsRequired && !receiptIsUploaded) {
      return res.status(400).json({
        success: false,
        error: "Receipt proof must be submitted before completion",
      });
    }

    const reviewRequired =
      Boolean(existing.requiresManualReview) ||
      existing.receiptStatus === "review_required";
    const nextPayoutStatus = reviewRequired
      ? "manual_review_required"
      : receiptIsRequired && !receiptIsUploaded
        ? "awaiting_receipt"
        : "ready_for_payout";

    const completionWhere = {
      id: runId,
      assignedRunnerId: req.user.id,
      status: { in: ["arrived", "in_progress"] },
      deliveryConfirmedAt: { not: null },
      requiresManualReview: false,
      receiptStatus: receiptIsRequired ? "uploaded" : { not: "review_required" },
      payoutStatus: { not: "manual_review_required" },
    };

    const updateResult = await prisma.run.updateMany({
      where: completionWhere,
      data: {
        status: "completed",
        purchaseStatus:
          existing.purchaseStatus === "delivered"
            ? "completed"
            : existing.purchaseStatus,
        payoutStatus: nextPayoutStatus,
      },
    });

    const updatedRun = await prisma.run.findUnique({ where: { id: runId } });

    if (updateResult.count !== 1) {
      if (updatedRun && updatedRun.status === "completed") {
        return res.json({
          success: true,
          alreadyCompleted: true,
          run: redactRunForRunner(updatedRun),
        });
      }

      return res.status(400).json({
        success: false,
        error: "Run is not eligible for completion",
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.to(`run:${runId}`).emit("run.completed", {
        runId,
        runnerId: req.user.id,
      });

      io.to(`runner:${req.user.id}`).emit("run.updated", {
        run: redactRunForRunner(updatedRun),
      });

      io.to(`requester:${updatedRun.requesterId}`).emit("run.updated", {
        run: updatedRun,
      });
    }

    return res.json({
      success: true,
      run: redactRunForRunner(updatedRun),
    });
  } catch (err) {
    console.error("COMPLETE RUN ERROR:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to complete run",
    });
  }
}

router.post("/:runId/complete", auth, completeRun);
router.patch("/:runId/complete", auth, completeRun);

module.exports = router;
