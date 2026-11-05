const express = require("express");
const prisma = require("../config/db");
const auth = require("../middleware/auth");
const {
  ensurePendingOffersForRunner,
} = require("../services/runnerDispatchService");
const {
  prepareRunnerPayout,
} = require("../services/runnerPayoutFoundation");

const router = express.Router();

console.log("📍 ACTIVE JS RUNNERS ROUTE LOADED");

function redactRunForRunner(run) {
  if (!run) return run;

  const safeRun = { ...run };
  delete safeRun.deliveryPin;
  return safeRun;
}

/* ============================
   RUNNER STATUS
============================ */
router.post("/status", auth, async (req, res) => {
  try {
    if (req.user.role !== "runner") {
      return res.status(403).json({
        success: false,
        error: "Only runners can update status",
      });
    }

    const isOnline =
      req.body.online === true || req.body.online === "true";
    const isOffline =
      req.body.online === false || req.body.online === "false";

    if (!isOnline && !isOffline) {
      return res.status(400).json({
        success: false,
        error: "online must be true or false",
      });
    }

    const releasedOffers = isOnline
      ? await ensurePendingOffersForRunner({
          prisma,
          runnerId: req.user.id,
        })
      : [];

    const payload = {
      runnerId: req.user.id,
      online: isOnline,
      status: isOnline ? "online" : "offline",
      updatedAt: new Date().toISOString(),
    };

    const io = req.app.get("io");

    if (io) {
      io.emit("runner.status", payload);
      io.to(`runner:${req.user.id}`).emit("runner.status.updated", payload);

      releasedOffers.forEach(({ run, offer }) => {
        io.to(`runner:${req.user.id}`).emit("run.offer", {
          run: {
            ...redactRunForRunner(run),
            offerId: offer.id,
          },
          offer,
        });
      });
    }

    return res.json({
      success: true,
      runner: payload,
      offersCreated: releasedOffers.length,
    });
  } catch (err) {
    console.error("Runner status update error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to update runner status",
    });
  }
});

/* ============================
   RUNNER LOCATION
============================ */
router.post("/location", auth, async (req, res) => {
  try {
    if (req.user.role !== "runner") {
      return res.status(403).json({
        success: false,
        error: "Only runners can update location",
      });
    }

    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid coordinates",
      });
    }

    const payload = {
      runnerId: req.user.id,
      lat,
      lng,
      updatedAt: new Date().toISOString(),
    };

    const io = req.app.get("io");

    if (io) {
      io.emit("runner.location", payload);
      io.to(`runner:${req.user.id}`).emit("runner.location.updated", payload);
    }

    return res.json({
      success: true,
      location: payload,
    });
  } catch (err) {
    console.error("❌ RUNNER LOCATION ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to update runner location",
    });
  }
});

/* ============================
   RUNNER PAYOUT FOUNDATION
============================ */
router.get("/payouts/summary", auth, async (req, res) => {
  try {
    if (req.user.role !== "runner") {
      return res.status(403).json({
        success: false,
        error: "Only runners can view payout status",
      });
    }

    const [runner, completedRuns, payoutLedger] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          role: true,
          stripeConnectedAccountId: true,
          payoutOnboardingStatus: true,
        },
      }),
      prisma.run.findMany({
        where: {
          assignedRunnerId: req.user.id,
          status: "completed",
        },
        select: {
          id: true,
          item: true,
          runnerPayout: true,
          payoutStatus: true,
          paymentStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.runnerPayout.findMany({
        where: { runnerId: req.user.id },
        select: {
          id: true,
          runId: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!runner) {
      return res.status(404).json({
        success: false,
        error: "Runner not found",
      });
    }

    const completedEarnings = completedRuns.reduce(
      (total, run) => total + Number(run.runnerPayout || 0),
      0
    );

    const readyForPayout = completedRuns
      .filter(
        (run) =>
          run.paymentStatus === "captured" &&
          run.payoutStatus === "ready_for_payout"
      )
      .reduce(
        (total, run) => total + Number(run.runnerPayout || 0),
        0
      );

    const preparedAmount = payoutLedger
      .filter((payout) => payout.status === "prepared")
      .reduce(
        (total, payout) => total + Number(payout.amount || 0),
        0
      );

    return res.json({
      success: true,
      onboarding: {
        connected: Boolean(runner.stripeConnectedAccountId),
        status: runner.payoutOnboardingStatus,
      },
      balances: {
        completedEarnings,
        readyForPayout,
        preparedAmount,
      },
      payouts: payoutLedger,
    });
  } catch (err) {
    console.error("Runner payout summary error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to load payout status",
    });
  }
});

router.post("/payouts/:runId/prepare", auth, async (req, res) => {
  try {
    if (req.user.role !== "runner") {
      return res.status(403).json({
        success: false,
        error: "Only runners can prepare payouts",
      });
    }

    const runId = Number(req.params.runId);

    if (!Number.isInteger(runId) || runId <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid run id",
      });
    }

    const [runner, run] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
      }),
      prisma.run.findUnique({
        where: { id: runId },
      }),
    ]);

    if (!runner || !run) {
      return res.status(404).json({
        success: false,
        error: "Runner or run not found",
      });
    }

    const result = await prepareRunnerPayout({
      prisma,
      runner,
      run,
      currency: process.env.STRIPE_CURRENCY,
    });

    return res.json({
      success: true,
      alreadyPrepared: result.alreadyPrepared,
      payout: {
        id: result.payout.id,
        runId: result.payout.runId,
        amount: result.payout.amount,
        currency: result.payout.currency,
        status: result.payout.status,
      },
      transferExecuted: false,
    });
  } catch (err) {
    const message = String(err?.message || "");

    if (
      message.includes("not assigned") ||
      message.includes("Only runner accounts")
    ) {
      return res.status(403).json({
        success: false,
        error: "Payout is not available for this runner",
      });
    }

    if (
      message.includes("onboarding") ||
      message.includes("not ready") ||
      message.includes("must be completed") ||
      message.includes("must be captured") ||
      message.includes("not ready for payout")
    ) {
      return res.status(400).json({
        success: false,
        error: message,
      });
    }

    console.error("Runner payout preparation error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to prepare runner payout",
    });
  }
});

module.exports = router;
