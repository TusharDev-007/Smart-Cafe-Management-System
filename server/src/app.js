const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const env = require("./config/env");
const prisma = require("./lib/prisma");

const menuRoutes = require("./routes/menu.routes");
const orderRoutes = require("./routes/order.routes");
const authRoutes = require("./routes/auth.routes");
const errorHandler = require("./middleware/errorHandler");
const analyticsRoutes = require("./routes/analytics.routes");
const tableRoutes = require("./routes/table.routes");
const recommendationRoutes = require("./routes/recommendation.routes");
const adminMenuRoutes = require("./routes/menu.admin.routes");
const paymentRoutes = require("./routes/payment.routes");
const path = require("path");

const app = express();

// Your deployment platform (for example, Render) sits behind a proxy.
app.set("trust proxy", 1);

// Add security-related HTTP headers.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://checkout.razorpay.com"],
        frameSrc: ["https://api.razorpay.com", "https://checkout.razorpay.com"],
        connectSrc: ["'self'", "https://api.razorpay.com", "https://lumberjack.razorpay.com", "ws:", "wss:"],
        imgSrc: ["'self'", "data:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      },
    },
  })
);

// Allow only configured frontend origins.
const allowedOrigins = (env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
  })
);

app.use(express.json());

// Check both the API server and its database connection.
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/admin/menu", adminMenuRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/staff", require("./routes/staff.routes"));

if (process.env.NODE_ENV === "production") {
  const dist = path.join(__dirname, "..", "..", "client", "dist");
  app.use(express.static(dist));
  app.get(/^\/(?!api|socket\.io|health).*/, (req, res) =>
    res.sendFile(path.join(dist, "index.html"))
  );
}
// Keep the error handler after all routes.
app.use(errorHandler);

module.exports = app;