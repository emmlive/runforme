const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = require("../config/db");
const { validatePassword } = require("../services/passwordPolicy");
const { createPasswordRecoveryService } = require("../services/passwordRecovery");
const { recoveryDelivery } = require("../services/recoveryDelivery");
const {
  recoveryRequestLimiter,
} = require("../services/recoveryRequestLimiter");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

const FORGOT_PASSWORD_RESPONSE =
  "If an account exists for that email and recovery is available, instructions will be sent.";
const INVALID_RESET_RESPONSE = "Invalid or expired reset link";

if (process.env.NODE_ENV === "production" && !JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

const passwordRecovery = createPasswordRecoveryService({
  prisma,
  delivery: recoveryDelivery,
});

router.post("/register", async (req, res) => {
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

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
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

router.post("/login", async (req, res) => {
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
      {
        userId: user.id,
        role: user.role,
        sessionVersion: user.sessionVersion,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token, role: user.role });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.json({ message: FORGOT_PASSWORD_RESPONSE });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const ipRecoveryRequest =
      recoveryRequestLimiter.checkRecoveryRequest(
        `ip:${req.ip || "unknown"}`
      );

    const emailRecoveryRequest =
      recoveryRequestLimiter.checkRecoveryRequest(
        `email:${normalizedEmail}`
      );

    if (
      !ipRecoveryRequest.allowed ||
      !emailRecoveryRequest.allowed
    ) {
      return res.json({ message: FORGOT_PASSWORD_RESPONSE });
    }

    if (!recoveryDelivery.isEnabled()) {
      return res.json({ message: FORGOT_PASSWORD_RESPONSE });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (user) {
      if (!process.env.FRONTEND_URL) {
        return res.json({ message: FORGOT_PASSWORD_RESPONSE });
      }

      const resetUrlBase = new URL(
        "/reset-password",
        process.env.FRONTEND_URL
      ).toString();

      await passwordRecovery.issuePasswordReset({
        userId: user.id,
        email: user.email,
        resetUrlBase,
      });
    }

    return res.json({ message: FORGOT_PASSWORD_RESPONSE });
  } catch (err) {
    console.error("Forgot password error");
    return res.json({ message: FORGOT_PASSWORD_RESPONSE });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: INVALID_RESET_RESPONSE });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await passwordRecovery.resetPassword({
      token,
      passwordHash,
    });

    if (!result.reset) {
      return res.status(400).json({ error: INVALID_RESET_RESPONSE });
    }

    return res.json({
      message: "Password reset successfully. Please sign in again.",
    });
  } catch (err) {
    console.error("Reset password error");
    return res.status(400).json({ error: INVALID_RESET_RESPONSE });
  }
});

module.exports = router;
