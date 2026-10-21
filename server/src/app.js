const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const menuRoutes = require("./routes/menu.routes");
const orderRoutes = require("./routes/order.routes");
const authRoutes = require("./routes/auth.routes");
const errorHandler = require("./middleware/errorHandler");
const analyticsRoutes = require("./routes/analytics.routes");
const tableRoutes = require("./routes/table.routes");
const recommendationRoutes = require("./routes/recommendation.routes");
const adminMenuRoutes = require("./routes/menu.admin.routes");

const app = express();

app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/admin/menu", adminMenuRoutes);

app.use(errorHandler);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/tables", tableRoutes);

module.exports = app;