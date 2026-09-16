const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV === "production" && !JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

/**
 * Auth middleware
 * - Verifies JWT from Authorization header
 * - Requires a sessionVersion claim
 * - Verifies the current persisted user/session version
 * - Attaches persisted user identity to req.user
 *
 * Header format:
 * Authorization: Bearer <token>
 */
module.exports = async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ error: "Invalid Authorization format" });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      !Number.isInteger(decoded.userId) ||
      !Number.isInteger(decoded.sessionVersion)
    ) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        sessionVersion: true,
      },
    });

    if (!user || user.sessionVersion !== decoded.sessionVersion) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    return next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
