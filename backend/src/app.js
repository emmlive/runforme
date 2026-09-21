console.log("✅ RUNNING APP FILE: src/app.js");

const express = require("express");
const cors = require("cors");
const { corsOrigin } = require("./config/cors");
require("dotenv").config();

/* ---------- Prisma ---------- */
const prisma = require("./config/db");
console.log("🐘 Prisma Client Initialized");

/* ---------- Auth Middleware ---------- */
const auth = require("./middleware/auth");

/* ---------- Stripe Webhook Route (MUST BE FIRST) ---------- */
const webhookRouter = require("./routes/webhooks");
const runsRouter = require("./routes/runs");
const runnersRouter = require("./routes/runners");
const authRouter = require("./routes/auth");

/* ---------- App ---------- */
const app = express();
app.set("trust proxy", 2);

/* ==========================================================
   CRITICAL ORDER:
   1️⃣ Webhook raw body
   2️⃣ JSON parser for everything else
========================================================== */

app.use("/webhooks", webhookRouter); // RAW body handled inside route

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

/* ============================
   HEALTH
============================ */
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    app: "Runforme",
    time: new Date().toISOString(),
  });
});

/* ============================
   AUTH TEST
============================ */
app.use("/api/auth", authRouter);

app.get("/api/me", auth, (req, res) => {
  res.json({ message: "JWT auth working ✅", user: req.user });
});

/* ============================
   RUNFORME RUN ROUTES
============================ */
app.use("/api/runs", runsRouter);
app.use("/api/runners", runnersRouter);

/* ============================
   (All your existing run/offer routes remain unchanged)
   — I am not modifying your business logic —
============================ */

/* ============================
   404
============================ */
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
  });
});

module.exports = app;
