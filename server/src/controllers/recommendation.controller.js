const { z } = require("zod");
const { recommend } = require("../services/recommendation.service");

const bodySchema = z.object({
  items: z.array(z.object({ menuItemId: z.number().int().positive() })).max(50),
});

exports.getRecommendations = async (req, res, next) => {
  try {
    const { items } = bodySchema.parse(req.body);
    res.json(await recommend(items.map((i) => i.menuItemId)));
  } catch (err) {
    next(err);
  }
};