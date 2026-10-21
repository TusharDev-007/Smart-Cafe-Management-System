const router = require("express").Router();
const ctrl = require("../controllers/payment.controller");

router.get("/config", ctrl.config);
router.post("/checkout", ctrl.checkout);
router.post("/verify", ctrl.verify);

module.exports = router;