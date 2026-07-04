console.log("✅ RUNNING APP FILE: src/app.js");

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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

/* ---------- App ---------- */
const app = express();
const JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV === "production" && !JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

/* ==========================================================
   CRITICAL ORDER:
   1️⃣ Webhook raw body
   2️⃣ JSON parser for everything else
========================================================== */

app.use("/webhooks", webhookRouter); // RAW body handled inside route

app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : true,
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
   AUTH — REGISTER
============================ */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        error: "email, password, and role are required",
      });
    }

    if (!["requester", "runner"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role },
      select: { id: true, email: true, role: true },
    });

    return res.status(201).json(user);
  } catch (err) {
    console.error("Register error:", err);
    if (err.code === "P2002") {
      return res.status(409).json({ error: "User already exists" });
    }
    return res.status(500).json({ error: "Registration failed" });
  }
});

/* ============================
   AUTH — LOGIN
============================ */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "email and password are required",
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token, role: user.role });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

/* ============================
   AUTH TEST
============================ */
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
