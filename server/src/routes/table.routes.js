const router = require("express").Router();
const ctrl = require("../controllers/table.controller");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth("ADMIN"));

router.get("/", ctrl.listTables);
router.post("/", ctrl.addTable);

module.exports = router;