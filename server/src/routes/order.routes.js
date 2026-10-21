const router = require("express").Router();
const ctrl = require("../controllers/order.controller");
const { requireAuth } = require("../middleware/auth");

const staff = requireAuth("KITCHEN", "ADMIN");

router.post("/", ctrl.createOrder);               // public: customers place orders
router.get("/track/:token", ctrl.trackOrder);     // public: needs the unguessable token
router.get("/active", staff, ctrl.listActive);
router.get("/:id", staff, ctrl.getOrder);
router.patch("/:id/status", staff, ctrl.updateStatus);

module.exports = router;