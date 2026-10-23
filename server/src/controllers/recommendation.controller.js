const { z } = require("zod");
const { recommend } = require("../services/recommendation.service");

const itemList = z.array(z.object({ menuItemId: z.number().int().positive() }));

const bodySchema = z.object({
  items: itemList.max(50),
  earlierItems: itemList.max(100).default([]), // items from this table's earlier orders
});

exports.getRecommendations = async (req, res, next) => {
  try {
    const { items, earlierItems } = bodySchema.parse(req.body);
    res.json(
      await recommend(
        items.map((i) => i.menuItemId),
        earlierItems.map((i) => i.menuItemId)
      )
    );
  } catch (err) {
    next(err);
  }
};