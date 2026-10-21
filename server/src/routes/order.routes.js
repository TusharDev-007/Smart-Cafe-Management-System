const router = require("express").Router();
const ctrl = require("../controllers/order.controller");
const { requireAuth } = require("../middleware/auth");

const staff = requireAuth("KITCHEN", "ADMIN");

router.get("/active", staff, ctrl.listActive); // must stay above "/:id"
router.get("/:id", ctrl.getOrder);             // public: customers track their order
router.post("/", ctrl.createOrder);            // public: customers place orders
router.patch("/:id/status", staff, ctrl.updateStatus);

module.exports = router;