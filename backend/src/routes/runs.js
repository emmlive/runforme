const express = require("express");
const prisma = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();

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
        .filter((offer) => offer.run && offer.run.status === "open")
        .map((offer) => ({
          ...offer.run,
          offerId: offer.id,
        }));

      const assignedRuns = await prisma.run.findMany({
        where: {
          assignedRunnerId: userId,
          status: { in: ["assigned", "arrived", "in_progress"] },
        },
        orderBy: { createdAt: "desc" },
      });

      const byId = new Map();
      [...assignedRuns, ...offeredRuns].forEach((run) => {
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
    const itemBudgetEstimate = readSafeMoney(req.body.itemBudgetEstimate, 0);
    const platformFee = readSafeMoney(req.body.platformFee, 0);
    const bufferAmount = readSafeMoney(req.body.bufferAmount, 0);

    if (!location || !item) {
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

    const result = await prisma.$transaction(async (tx) => {
      const run = await tx.run.create({
        data: {
          requesterId: req.user.id,
          location,
          item,
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

    if (io) {
      result.offers.forEach((offer) => {
        io.to(`runner:${offer.runnerId}`).emit("run.offer", {
          run: result.run,
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

    const updatedRun = await prisma.$transaction(async (tx) => {
      const existing = await tx.run.findUnique({
        where: { id: runId },
      });

      console.log("🧠 RUN BEFORE ACCEPT:", existing);

      if (!existing) {
        throw new Error("Run not found");
      }

      if (existing.assignedRunnerId) {
        throw new Error("Run already assigned");
      }

      if (existing.status !== "open") {
        throw new Error(`Run not valid for accept: ${existing.status}`);
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

      await tx.offer.updateMany({
        where: {
          runId,
          id: { not: offer.id },
        },
        data: { status: "rejected" },
      });

      return tx.run.update({
        where: { id: runId },
        data: {
          status: "assigned",
          assignedRunnerId: runnerId,
          paymentStatus: "pending_payment_method",
        },
      });
    });

    console.log(`✅ Run ${runId} accepted by runner ${runnerId}`);

    const io = req.app.get("io");

    if (io) {
      io.to(`run:${runId}`).emit("run.assigned", {
        runId,
        runnerId,
      });

      io.to(`runner:${runnerId}`).emit("run.updated", {
        run: updatedRun,
      });

      io.to(`requester:${updatedRun.requesterId}`).emit("run.updated", {
        run: updatedRun,
      });
    }

    return res.json({
      success: true,
      run: updatedRun,
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

    if (req.user.role !== "runner" || !runId) {
      return res.status(400).json({
        success: false,
        error: "Invalid arrived request",
      });
    }

    const run = await prisma.run.updateMany({
      where: {
        id: runId,
        assignedRunnerId: req.user.id,
        status: "assigned",
      },
      data: { status: "arrived" },
    });

    if (run.count !== 1) {
      return res.status(400).json({
        success: false,
        error: "Run not ready for arrived",
      });
    }

    const updatedRun = await prisma.run.findUnique({ where: { id: runId } });
    const io = req.app.get("io");

    if (io) {
      io.to(`run:${runId}`).emit("run.updated", { run: updatedRun });
      io.to(`runner:${req.user.id}`).emit("run.updated", { run: updatedRun });
    }

    return res.json({ success: true, run: updatedRun });
  } catch (err) {
    console.error("❌ ARRIVED ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to mark arrived",
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

    const updatedRun = await prisma.run.update({
      where: { id: runId },
      data: { status: "in_progress" },
    });

    return res.json({ success: true, run: updatedRun });
  } catch (err) {
    console.error("❌ START RUN ERROR:", err);
    return res.status(400).json({
      success: false,
      error: "Failed to start run",
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

    if (!submittedPin) {
      return res.status(400).json({
        success: false,
        error: "Delivery PIN is required",
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

    if (!existing.deliveryPin || existing.deliveryPin !== submittedPin) {
      return res.status(400).json({
        success: false,
        error: "Invalid delivery PIN",
      });
    }

    if (existing.deliveryConfirmedAt) {
      return res.json({
        success: true,
        alreadyConfirmed: true,
        run: existing,
      });
    }

    const updatedRun = await prisma.run.update({
      where: { id: runId },
      data: {
        deliveryConfirmedAt: new Date(),
        purchaseStatus: "delivered",
        payoutStatus: "ready_for_payout",
      },
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`run:${runId}`).emit("run.delivery_confirmed", {
        runId,
        runnerId: req.user.id,
      });

      io.to(`runner:${req.user.id}`).emit("run.updated", {
        run: updatedRun,
      });

      io.to(`requester:${updatedRun.requesterId}`).emit("run.updated", {
        run: updatedRun,
      });
    }

    return res.json({
      success: true,
      run: updatedRun,
    });
  } catch (err) {
    console.error("CONFIRM DELIVERY ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to confirm delivery",
    });
  }
});

async function completeRun(req, res) {
  try {
    const runId = parseRunId(req.params.runId);

    if (!runId) {
      return res.status(400).json({ success: false, error: "Invalid runId" });
    }

    const updatedRun = await prisma.run.update({
      where: { id: runId },
      data: { status: "completed" },
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`run:${runId}`).emit("run.updated", { run: updatedRun });
      if (updatedRun.assignedRunnerId) {
        io.to(`runner:${updatedRun.assignedRunnerId}`).emit("run.updated", {
          run: updatedRun,
        });
      }
    }

    return res.json({ success: true, run: updatedRun });
  } catch (err) {
    console.error("❌ COMPLETE RUN ERROR:", err);
    return res.status(400).json({
      success: false,
      error: "Failed to complete run",
    });
  }
}

router.post("/:runId/complete", auth, completeRun);
router.patch("/:runId/complete", auth, completeRun);

module.exports = router;
