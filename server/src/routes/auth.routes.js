const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");
const { login } = require("../controllers/auth.controller");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // 20 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in a few minutes." },
});

router.post("/login", loginLimiter, login);

module.exports = router;