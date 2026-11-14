
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");

// Usage: requireAuth("KITCHEN", "ADMIN")
function requireAuth(...roles) {
  return async (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || "").split(" ");

    if (scheme !== "Bearer" || !token) {
      return next(new AppError(401, "Login required"));
    }

    let payload;

    // First, verify the JWT.
    try {
      payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
    } catch {
      return next(new AppError(401, "Session expired, please log in again"));
    }

    // Then, verify the current staff account in the database.
    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(payload.sub) },
        select: {
          id: true,
          name: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return next(new AppError(401, "Session expired, please log in again"));
      }

      // Use the current database role, not the potentially outdated JWT role.
      if (roles.length && !roles.includes(user.role)) {
        return next(new AppError(403, "You do not have access to this"));
      }

      req.user = {
        id: user.id,
        role: user.role,
        name: user.name,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireAuth };
