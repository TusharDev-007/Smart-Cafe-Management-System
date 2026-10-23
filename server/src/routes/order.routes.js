const router = require("express").Router();
const ctrl = require("../controllers/order.controller");
const { requireAuth } = require("../middleware/auth");

const staff = requireAuth("KITCHEN", "ADMIN");
const cashier = requireAuth("CASHIER", "ADMIN");

router.post("/", ctrl.createOrder); // public: customers place orders
router.get("/track/:token", ctrl.trackOrder); // public: needs the unguessable token

router.get("/active", staff, ctrl.listActive);
router.get("/pending-payment", cashier, ctrl.listPendingPayment); // must stay above "/:id"
router.get("/:id", staff, ctrl.getOrder);
router.patch("/:id/status", staff, ctrl.updateStatus);

router.post("/:id/confirm-payment", cashier, ctrl.confirmPayment);
router.post("/:id/reject", cashier, ctrl.rejectOrder);

module.exports = router;