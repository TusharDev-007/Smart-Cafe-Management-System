const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const staff = require("../controllers/staff.controller");

router.use(requireAuth("ADMIN"));
router.get("/", staff.list);
router.post("/", staff.create);
router.patch("/:id", staff.update);

module.exports = router;