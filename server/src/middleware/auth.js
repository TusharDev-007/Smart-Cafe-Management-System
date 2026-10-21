const jwt = require("jsonwebtoken");
const env = require("../config/env");
const AppError = require("../utils/AppError");

// Usage: requireAuth("KITCHEN", "ADMIN")
function requireAuth(...roles) {
  return (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) return next(new AppError(401, "Login required"));

    try {
      const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
      if (roles.length && !roles.includes(payload.role)) {
        return next(new AppError(403, "You do not have access to this"));
      }
      req.user = { id: Number(payload.sub), role: payload.role, name: payload.name };
      next();
    } catch {
      next(new AppError(401, "Session expired, please log in again"));
    }
  };
}

module.exports = { requireAuth };