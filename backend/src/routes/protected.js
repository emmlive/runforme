const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * Protected test route
 * Requires valid JWT
 */
router.get("/me", auth, (req, res) => {
  res.json({
    message: "✅ You are authenticated",
    user: req.user,
  });
});

module.exports = router;
