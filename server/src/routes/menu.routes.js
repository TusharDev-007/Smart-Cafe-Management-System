const router = require("express").Router();
const { getMenu } = require("../controllers/menu.controller");

router.get("/", getMenu);

module.exports = router;