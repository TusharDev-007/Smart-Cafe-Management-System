const router = require("express").Router();
const ctrl = require("../controllers/analytics.controller");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth("ADMIN")); // admin only

router.get("/summary", ctrl.summary);
router.get("/orders-by-hour", ctrl.ordersByHour);
router.get("/heatmap", ctrl.heatmap);
router.get("/top-items", ctrl.topItems);

module.exports = router;