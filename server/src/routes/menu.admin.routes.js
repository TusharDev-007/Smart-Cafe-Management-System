const router = require("express").Router();
const ctrl = require("../controllers/menu.admin.controller");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth("ADMIN"));

router.get("/", ctrl.listAll);
router.post("/items", ctrl.createItem);
router.patch("/items/:id", ctrl.updateItem);
router.delete("/items/:id", ctrl.deleteItem);
router.post("/categories", ctrl.createCategory);
router.patch("/categories/:id", ctrl.updateCategory);
router.delete("/categories/:id", ctrl.deleteCategory);

module.exports = router;