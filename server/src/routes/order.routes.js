const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const ctrl = require("../controllers/order.controller");
const { requireAuth } = require("../middleware/auth");

const staff = requireAuth("KITCHEN", "ADMIN");
const cashier = requireAuth("CASHIER", "ADMIN");

// Stops scripts from flooding the cashier with fake orders. The limit is per internet address,
// and customers on the cafe's Wi-Fi share one address, so it is generous.
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40, // express-rate-limit v7+
  max: 40, // older versions
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many orders from this connection. Please ask the cashier for help.",
    message: "Too many orders from this connection. Please ask the cashier for help.",
  },
});

router.post("/", orderLimiter, ctrl.createOrder); // public: customers place orders
router.get("/track/:token", ctrl.trackOrder); // public: needs the unguessable token

router.get("/active", staff, ctrl.listActive);
router.get("/pending-payment", cashier, ctrl.listPendingPayment); // must stay above "/:id"
router.get("/:id", staff, ctrl.getOrder);
router.patch("/:id/status", staff, ctrl.updateStatus);

router.post("/:id/confirm-payment", cashier, ctrl.confirmPayment);
router.post("/:id/reject", cashier, ctrl.rejectOrder);

module.exports = router;