
require("dotenv").config();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || process.env.CLIENT_URL;

const required = ["DATABASE_URL", "JWT_SECRET"];
const missing = required.filter((k) => !process.env[k]);

if (!CLIENT_ORIGIN) {
  missing.push("CLIENT_ORIGIN (or CLIENT_URL)");
}

if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters");
  process.exit(1);
}

module.exports = {
  PORT: Number(process.env.PORT) || 5000,

  // Keep CLIENT_URL for compatibility with existing project files.
  CLIENT_URL: CLIENT_ORIGIN,
  CLIENT_ORIGIN,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "12h",

  TZ_OFFSET_MINUTES: Number(process.env.TZ_OFFSET_MINUTES ?? 330),

  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || null,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || null,
};
