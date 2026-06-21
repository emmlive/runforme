/**
 * Role-based authorization middleware
 *
 * Usage:
 * requireRole("requester")
 * requireRole("runner")
 */
module.exports = function requireRole(requiredRole) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        error: `Forbidden: ${requiredRole} role required`,
      });
    }

    next();
  };
};
