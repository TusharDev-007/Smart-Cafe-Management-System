const router = require("express").Router();
const { getRecommendations } = require("../controllers/recommendation.controller");

router.post("/", getRecommendations); // public: customers use it from the cart

module.exports = router;