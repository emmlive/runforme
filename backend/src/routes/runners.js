const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

console.log("📍 ACTIVE JS RUNNERS ROUTE LOADED");

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
