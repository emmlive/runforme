const express = require("express");
const prisma = require("../config/db");
const auth = require("../middleware/auth");
const {
  ensurePendingOffersForRunner,
} = require("../services/runnerDispatchService");

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

module.exports = router;
