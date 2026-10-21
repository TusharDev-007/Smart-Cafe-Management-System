const prisma = require("../lib/prisma");

exports.listTables = async (req, res, next) => {
  try {
    res.json(await prisma.cafeTable.findMany({ orderBy: { number: "asc" } }));
  } catch (err) {
    next(err);
  }
};

// Adds the next table number
exports.addTable = async (req, res, next) => {
  try {
    const last = await prisma.cafeTable.findFirst({ orderBy: { number: "desc" } });
    const table = await prisma.cafeTable.create({ data: { number: (last?.number ?? 0) + 1 } });
    res.status(201).json(table);
  } catch (err) {
    next(err);
  }
};