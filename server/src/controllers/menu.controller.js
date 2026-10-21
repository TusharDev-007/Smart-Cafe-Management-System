const prisma = require("../lib/prisma");

exports.getMenu = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { items: { where: { isAvailable: true }, orderBy: { id: "asc" } } },
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
};