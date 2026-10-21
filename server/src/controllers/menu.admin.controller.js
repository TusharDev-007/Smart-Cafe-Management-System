const { z } = require("zod");
const svc = require("../services/menu.service");

const idSchema = z.coerce.number().int().positive();

const itemFields = {
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).nullable().optional(),
  pricePaise: z.number().int().min(1).max(1000000),
  isVeg: z.boolean(),
  isAvailable: z.boolean(),
};

const createItemSchema = z.object(itemFields);
const updateItemSchema = z
  .object(itemFields)
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: "Nothing to update" });

const categoryName = z.string().trim().min(1).max(50);
const createCategorySchema = z.object({ name: categoryName });
const updateCategorySchema = z
  .object({ name: categoryName, sortOrder: z.number().int().min(0).max(1000) })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: "Nothing to update" });

// Runs a handler, sends its result as JSON, and forwards errors
const wrap =
  (fn, status = 200) =>
  async (req, res, next) => {
    try {
      res.status(status).json(await fn(req));
    } catch (err) {
      next(err);
    }
  };

exports.listAll = wrap(() => svc.listAll());
exports.createItem = wrap((req) => svc.createItem(createItemSchema.parse(req.body)), 201);
exports.updateItem = wrap((req) =>
  svc.updateItem(idSchema.parse(req.params.id), updateItemSchema.parse(req.body))
);
exports.deleteItem = wrap((req) => svc.deleteItem(idSchema.parse(req.params.id)));
exports.createCategory = wrap(
  (req) => svc.createCategory(createCategorySchema.parse(req.body).name),
  201
);
exports.updateCategory = wrap((req) =>
  svc.updateCategory(idSchema.parse(req.params.id), updateCategorySchema.parse(req.body))
);
exports.deleteCategory = wrap((req) => svc.deleteCategory(idSchema.parse(req.params.id)));